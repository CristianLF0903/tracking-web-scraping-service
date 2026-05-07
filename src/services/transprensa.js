import { launchBrowser } from "../utils/browser.js";
import { TRANSPRENSA_URL_BASE } from "../config/constants.js";

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
  let browser = null;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = `${TRANSPRENSA_URL_BASE}${guia}`;
    console.log(`[Transprensa] Navegando a: ${url}`);

    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const status = response ? response.status() : "No response";
    console.log(`[Transprensa] Status HTTP: ${status}`);

    if (status >= 400) {
      console.warn(`[Transprensa] Error HTTP detectado: ${status}. Es posible que el sitio esté bloqueando la petición.`);
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log(`[Transprensa] Snippet de la página: ${bodyText}`);
      await browser.close();
      return null;
    }

    // Timeout solicitado después de ingresar al sitio
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Click en "Más detalles"
    const showMoreSelector = "a#showMore";
    await page.waitForSelector(showMoreSelector, { timeout: 15000 }).catch(async (e) => {
        const pageTitle = await page.title();
        const bodySnippet = await page.evaluate(() => document.body.innerText.substring(0, 300));
        console.error(`[Transprensa] Error esperando selector '${showMoreSelector}':`, e.message);
        console.log(`[Transprensa] Estado de la página -> Título: "${pageTitle}", Body: "${bodySnippet}"`);
        throw e;
    });
    
    await page.click(showMoreSelector);

    // Esperar que cargue el timeline
    const timelineSelector = ".cbp_tmtimeline";
    await page.waitForSelector(timelineSelector, { timeout: 15000 }).catch(async (e) => {
        console.error(`[Transprensa] Error esperando timeline '${timelineSelector}':`, e.message);
        const bodySnippet = await page.evaluate(() => document.body.innerText.substring(0, 300));
        console.log(`[Transprensa] Contenido actual de la página: "${bodySnippet}"`);
        throw e;
    });

    // Extraer la información del timeline
    const timelineData = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".cbp_tmtimeline li"));
      if (items.length === 0) return null;

      const mappedItems = items.map((li) => {
        const timeSpans = li.querySelectorAll(".cbp_tmtime span");
        const date = timeSpans[1]?.textContent.trim() || "";
        const time = timeSpans[2]?.textContent.trim() || "";
        const status = li.querySelector(".cbp_tmlabel h2")?.textContent.trim() || "";

        return {
          fecha: `${date} ${time}`.trim(),
          estado: status,
        };
      });

      return mappedItems;
    });

    await browser.close();
    browser = null;

    if (timelineData && timelineData.length > 0) {
      // El último item es el estado actual
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

    return null;
  } catch (error) {
    console.error(`Error consultando Transprensa para la guía ${guia}:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
