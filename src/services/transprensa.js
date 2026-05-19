import { launchCamoufox } from "../utils/browser.js";
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
    return "Entregado";
  }

  // Otros estados como EMBARQUE, DISTRIBUCION, EN BODEGA, EN PROCESO
  return "En camino";
}

export async function consultarGuiaTransprensa(guia) {
  let browser = null;

  try {
    // Usamos Camoufox (Playwright) para máximo sigilo en Transprensa
    browser = await launchCamoufox({ headless: true });
    
    // Crear un nuevo contexto y página
    const context = await browser.newContext();
    const page = await context.newPage();

    const url = `${TRANSPRENSA_URL_BASE}${guia}`;
    console.log(`[Transprensa] Consultando con Camoufox: ${url}`);

    // Navegar
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Pequeña espera para asegurar carga dinámica
    await page.waitForTimeout(3000);

    // Click en "Más detalles"
    const showMoreSelector = "a#showMore";
    try {
        await page.waitForSelector(showMoreSelector, { timeout: 15000 });
        await page.click(showMoreSelector);
    } catch (e) {
        console.warn(`[Transprensa] No se encontró el botón '${showMoreSelector}' o ya se hizo click.`);
        // Si no aparece el botón, quizás ya están visibles los detalles o hubo un bloqueo
    }

    // Esperar que cargue el timeline
    const timelineSelector = ".cbp_tmtimeline";
    await page.waitForSelector(timelineSelector, { timeout: 15000 });

    // Extraer la información del timeline usando Playwright
    const timelineData = await page.$$eval(".cbp_tmtimeline li", (items) => {
      return items.map((li) => {
        const spans = li.querySelectorAll(".cbp_tmtime span");
        const date = spans[1]?.textContent.trim() || "";
        const time = spans[2]?.textContent.trim() || "";
        const status = li.querySelector(".cbp_tmlabel h2")?.textContent.trim() || "";
        return { fecha: `${date} ${time}`.trim(), estado: status };
      });
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
        fechaEntrega: estadoNormalizado === "Entregado" ? lastItem.fecha : null,
      };
    }

    console.warn(`[Transprensa] Timeline vacío para la guía ${guia}.`);
    return null;
  } catch (error) {
    console.error(`[Transprensa] Error consultando con Camoufox:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
