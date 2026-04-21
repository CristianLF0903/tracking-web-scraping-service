import { launchBrowser } from "../utils/browser.js";
import { ENVIA_URL_BASE } from "../config/constants.js";

function normalizarEstadoEnvia(estado) {
  const e = estado.toLowerCase();

  if (e.includes("entregamos") || e.includes("entregado")) {
    return "Recibido";
  }

  if (
    e.includes("prepárate para") ||
    e.includes("movimiento") ||
    e.includes("proceso")
  ) {
    return "En camino";
  }

  if (e.includes("generada")) {
    return "Enviado";
  }

  // Casos generales para mantener consistencia
  if (
    e.includes("reparto") ||
    e.includes("transporte") ||
    e.includes("terminal") ||
    e.includes("vía")
  ) {
    return "En camino";
  }

  return "En camino";
}

export async function consultarGuiaEnvia(guia) {
  const url = `${ENVIA_URL_BASE}${guia}`;
  let browser = null;

  try {
    browser = await launchBrowser();

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // Aumentamos el timeout y esperamos a que la red esté tranquila
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Intentar cerrar popups agresivamente
    await page
      .evaluate(() => {
        const closeSelectors = [
          "button.close-popup",
          ".modal-header .close",
          ".close-modal",
          "#modalDescuento .close",
          '.modal [data-dismiss="modal"]',
        ];
        closeSelectors.forEach((sel) => {
          const btn = document.querySelector(sel);
          if (btn) btn.click();
        });
      })
      .catch(() => {});

    // Espera adicional para asegurar renderizado tras posibles cierres de modales
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const trackingData = await page.evaluate(() => {
      // Función auxiliar para limpiar texto
      const clean = (txt) => (txt ? txt.trim().replace(/\s+/g, " ") : null);

      // 1. Intentar con la línea de tiempo vertical (Lista de eventos en el lado derecho)
      // Selector basado en la estructura observada en hub.envia.co
      const verticalItems = document.querySelectorAll(
        ".timeline-vertical .timeline-item, .v-timeline .v-timeline-item",
      );
      if (verticalItems.length > 0) {
        const lastItem = verticalItems[0]; // El primero suele ser el más reciente
        const estado =
          lastItem.querySelector("h3, .title, strong")?.textContent;
        const fecha = lastItem.querySelector(".date, .time")?.textContent;
        if (estado) return { estado: clean(estado), fecha: clean(fecha) };
      }

      // 2. Intentar con los selectores del usuario para la línea horizontal
      const horizontalSteps = document.querySelectorAll(
        ".horizontal-timeline .timeline-step:not(.inactive)",
      );
      if (horizontalSteps.length > 0) {
        const lastStep = horizontalSteps[horizontalSteps.length - 1];
        const estado =
          lastStep.querySelector(".tracking-number")?.textContent ||
          lastStep.querySelector("p:last-child")?.textContent;
        const fecha = lastStep.querySelector(
          ".step-badge p:first-of-type",
        )?.textContent;
        if (estado) return { estado: clean(estado), fecha: clean(fecha) };
      }

      // 3. Buscar en cualquier título de estado prominente
      const mainStatus = document.querySelector(
        ".status-title, .tracking-status h3",
      );
      if (mainStatus) {
        return { estado: clean(mainStatus.textContent), fecha: null };
      }

      return null;
    });

    await browser.close();
    browser = null;

    if (trackingData && trackingData.estado) {
      const estadoNormalizado = normalizarEstadoEnvia(trackingData.estado);
      return {
        estadoActual: estadoNormalizado,
        estadoOriginal: trackingData.estado,
        fechaActualizacion: trackingData.fecha,
        fechaEnvio: null,
        fechaEntrega:
          estadoNormalizado === "Recibido" ? trackingData.fecha : null,
      };
    } else {
      const pageInfo = await page
        .evaluate(() => {
          return {
            title: document.title,
            bodyText: document.body.innerText.substring(0, 500),
            hasError:
              document.body.innerText.includes("not found") ||
              document.body.innerText.includes("error"),
          };
        })
        .catch(() => ({}));

      console.warn(
        `[Envia] No tracking details found for guide ${guia}. Page state:`,
        pageInfo,
      );
      return null;
    }
  } catch (error) {
    console.error(`Error consulting Envia guide ${guia}:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
