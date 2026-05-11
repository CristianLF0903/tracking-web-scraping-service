import axios from "axios";
import { TRANSPRENSA_URL_BASE, BROWSERLESS_BQL_ENDPOINT } from "../config/constants.js";
import { parseTransprensaTimeline } from "../utils/htmlParser.js";

/**
 * Normaliza el estado de la guía de Transprensa.
 */
function normalizarEstadoTransprensa(estado) {
  const e = estado.toUpperCase().trim();

  if (e.includes("DIGITADA") || e.includes("RECOLECTADA")) {
    return "Enviado";
  }

  if (e.includes("ENTREGADO")) {
    return "Recibido";
  }

  // Otros estados como EMBARQUE, DISTRIBUCION, EN BODEGA, EN PROCESO
  return "En camino";
}

export async function consultarGuiaTransprensa(guia) {
  const url = `${TRANSPRENSA_URL_BASE}${guia}`;
  const token = process.env.BROWSERLESS_TOKEN;

  if (!token) {
    console.error("[Transprensa-BQL] Error: BROWSERLESS_TOKEN no está definido en el archivo .env");
    return null;
  }

  // Mutation de BrowserQL para ejecutar toda la secuencia de una vez
  const query = `
    mutation ScrapeTransprensa {
      goto(url: "${url}", waitUntil: domContentLoaded) {
        status
        time
      }

      waitForShowMore: waitForSelector(selector: "a#showMore", timeout: 30000) {
        time
      }

      pauseBeforeScroll: waitForTimeout(time: 2000) {
        time
      }

      scrollDown: scroll(selector: "a#showMore") {
        time
      }

      pauseBeforeClick: waitForTimeout(time: 1500) {
        time
      }

      clickShowMore: click(selector: "a#showMore", visible: true) {
        time
      }

      waitForTimeline: waitForSelector(selector: ".cbp_tmtimeline", timeout: 30000, visible: true) {
        time
      }

      timelineHtml: html(selector: ".cbp_tmtimeline") {
        html
      }
    }
  `;

  try {
    console.log(`[Transprensa-BQL] Consultando guía ${guia} vía BrowserQL...`);
    
    const response = await axios.post(
      `${BROWSERLESS_BQL_ENDPOINT}?token=${token}`,
      { query },
      { 
        headers: { "Content-Type": "application/json" },
        timeout: 60000 // 60 segundos de timeout para la petición total
      }
    );

    const bqlData = response.data?.data;
    
    // Debug de la ejecución de BQL
    const gotoStatus = bqlData?.goto?.status;
    console.log(`[Transprensa-BQL] Status HTTP de la página: ${gotoStatus}`);

    if (gotoStatus >= 400) {
      console.warn(`[Transprensa-BQL] Error HTTP ${gotoStatus} detectado en la página de destino.`);
      return null;
    }

    const htmlContent = bqlData?.timelineHtml?.html;
    if (!htmlContent) {
      console.warn(`[Transprensa-BQL] No se pudo extraer el HTML del timeline para la guía ${guia}.`);
      return null;
    }

    // Parsear el HTML extraído
    const timelineData = parseTransprensaTimeline(htmlContent);

    if (timelineData && timelineData.length > 0) {
      const lastItem = timelineData[timelineData.length - 1];
      const firstItem = timelineData[0];
      const estadoNormalizado = normalizarEstadoTransprensa(lastItem.estado);

      return {
        estadoActual: estadoNormalizado,
        estadoOriginal: lastItem.estado,
        fechaActualizacion: lastItem.fecha,
        fechaEnvio: firstItem.fecha,
        fechaEntrega: estadoNormalizado === "Recibido" ? lastItem.fecha : null,
      };
    }

    console.warn(`[Transprensa-BQL] Timeline vacío o no procesado para la guía ${guia}.`);
    return null;
  } catch (error) {
    if (error.response?.data?.errors) {
      console.error(`[Transprensa-BQL] Errores de GraphQL:`, JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.error(`[Transprensa-BQL] Error consultando Transprensa:`, error.message);
    }
    return null;
  }
}
