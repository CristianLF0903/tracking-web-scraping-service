import { launchBrowser } from "../utils/browser.js";
import { HACEB_URL_BASE } from "../config/constants.js";

/**
 * Normaliza el estado de Haceb (DispatchTrack).
 */
function normalizarEstadoHaceb(estado) {
  const e = estado.toLowerCase().trim();

  if (e.includes("registrado") || e.includes("preparando")) {
    return "Enviado";
  }
  if (e.includes("destino") || e.includes("entregado")) {
    return "Recibido";
  }
  // "va en camino", etc.
  return "En camino";
}

export async function consultarGuiaHaceb(guia) {
  let browser = null;

  try {
    browser = await launchBrowser({ headless: false });
    const page = await browser.newPage();

    // Configurar User Agent para parecer un navegador real
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    console.log(`[Haceb] Navegando al widget de DispatchTrack...`);
    await page.goto(HACEB_URL_BASE, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Esperar que el formulario esté disponible
    await page.waitForSelector(".widget-box__input", { timeout: 15000 });

    // Escribir el número de cédula
    await page.type(".widget-box__input", guia, { delay: 50 });

    // Preparar captura de la nueva ventana ANTES de hacer click
    // En Puppeteer, 'page.waitForEvent' no existe (es de Playwright).
    // Usamos el evento 'targetcreated' del browser para capturar la nueva pestaña.
    const popupPromise = new Promise((resolve) =>
      browser.once("targetcreated", async (target) => {
        const newPage = await target.page();
        resolve(newPage);
      })
    );

    await page.click("#submit_btn");

    const newPage = await popupPromise;

    if (!newPage) {
      console.warn(`[Haceb] No se abrió nueva ventana para cédula ${guia}`);
      return null;
    }

    console.log(`[Haceb] Nueva ventana detectada, esperando timeline...`);

    // Esperar que la nueva página cargue el timeline
    await newPage.waitForSelector(".widget-result__tracking", {
      timeout: 30000,
    });

    // Extraer datos del timeline
    const timelineData = await newPage.evaluate(() => {
      const steps = Array.from(document.querySelectorAll(".step_horizontal"));
      if (steps.length === 0) return null;

      return steps.map((step) => {
        const estado =
          step.querySelector(".step__title b")?.textContent.trim() || "";
        const dateEl = step.querySelector(".step__content-date_horizontal");

        // El icono success indica si ese paso ya se completó
        const completado =
          step.querySelector(".step__icon_horizontal--success") !== null;

        let fecha = "";
        if (dateEl) {
          // El contenido es "29/04/2026<br>11:57", textContent lo une sin separador
          // Usamos innerHTML y split por <br>
          const raw = dateEl.innerHTML;
          const parts = raw.split(/<br\s*\/?>/i);
          const date = parts[0]?.trim() || "";
          const time = parts[1]?.trim() || "";
          fecha = `${date} ${time}`.trim();
        }

        return { fecha, estado, completado };
      });
    });

    await browser.close();
    browser = null;

    if (timelineData && timelineData.length > 0) {
      // Buscar el último paso completado
      const completedSteps = timelineData.filter((s) => s.completado);
      const lastCompleted =
        completedSteps[completedSteps.length - 1] || timelineData[0];
      const firstItem = timelineData[0];
      const estadoNormalizado = normalizarEstadoHaceb(lastCompleted.estado);

      return {
        estadoActual: estadoNormalizado,
        estadoOriginal: lastCompleted.estado,
        fechaActualizacion: lastCompleted.fecha,
        fechaEnvio: firstItem.fecha,
        fechaEntrega:
          estadoNormalizado === "Recibido" ? lastCompleted.fecha : null,
      };
    }

    console.warn(`[Haceb] Timeline vacío para cédula ${guia}`);
    return null;
  } catch (error) {
    console.error(`[Haceb] Error consultando cédula ${guia}:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
