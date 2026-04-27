import puppeteerCore from "puppeteer-core";
import { TCC_URL_BASE } from "../config/constants.js";

function normalizarEstadoTCC(estado) {
  const e = estado.toLowerCase();

  if (e.includes("entregado") || e.includes("exito") || e.includes("cumplido")) {
    return "Recibido";
  }

  if (
    e.includes("recogid") || // Captura "recogido" y "recogida"
    e.includes("recolectado") ||
    e.includes("despachado") ||
    e.includes("salida") ||
    e.includes("programado")
  ) {
    return "Enviado";
  }

  return "En camino";
}

export async function consultarGuiaTCC(guia) {
  const wsEndpoint = process.env.BROWSERLESS_WS_ENDPOINT;
  const token = process.env.BROWSERLESS_TOKEN;

  if (!wsEndpoint || !token || token === "your-token-here") {
    console.error(
      "[TCC] Faltan variables de entorno para browserless (WS_ENDPOINT o TOKEN)"
    );
    return null;
  }

  let browser = null;
  try {
    // Conectar a browserless con resolución de CAPTCHA
    browser = await puppeteerCore.connect({
      browserWSEndpoint: `${wsEndpoint}?token=${token}&solveCaptchas=true`,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navegar a TCC
    await page.goto(TCC_URL_BASE, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Esperar y llenar el campo de guía
    await page.waitForSelector('textarea[name="document"]', { timeout: 20000 });
    await page.type('textarea[name="document"]', guia);

    // Clic en buscar
    await page.click('button[aria-label="search-guide"]');

    // Esperar a que la resolución del CAPTCHA y la carga de resultados ocurran
    // Buscamos un selector que indique que los resultados están cargando o ya están ahí
    // TCC suele mostrar un resumen o una lista de eventos
    // Esperar a que el modal de resultados aparezca
    await page
      .waitForSelector(".ModalGuide-module__Container___akw03", {
        timeout: 45000,
      })
      .catch(() =>
        console.warn(`[TCC] Timeout esperando el modal de resultados para guía ${guia}`)
      );

    const trackingData = await page.evaluate(() => {
      const clean = (txt) => (txt ? txt.trim().replace(/\s+/g, " ") : null);

      // Buscamos los elementos de la historia en el modal
      const items = document.querySelectorAll(".ModalGuide-module__ItemDetails___F5QMu");
      
      if (items.length > 0) {
        const firstItem = items[0]; // El primero es el más reciente

        // Extraer texto del estado (está en un div hijo directo que no es el icono ni la fecha)
        const statusDiv = Array.from(firstItem.children).find(
          (el) =>
            el.tagName === "DIV" &&
            !el.className.includes("Icon") &&
            !el.className.includes("groupIconArrow")
        );

        // Extraer fecha (está dentro del div con clase groupIconArrow en un p)
        const dateP = firstItem.querySelector(
          ".ModalGuide-module__groupIconArrow___Gc7c4 p"
        );

        return {
          estado: clean(statusDiv?.textContent),
          fecha: clean(dateP?.textContent),
        };
      }

      return null;
    });

    if (trackingData && trackingData.estado) {
      const estadoNormalizado = normalizarEstadoTCC(trackingData.estado);
      return {
        estadoActual: estadoNormalizado,
        estadoOriginal: trackingData.estado,
        fechaActualizacion: trackingData.fecha,
        fechaEnvio: null,
        fechaEntrega:
          estadoNormalizado === "Recibido" ? trackingData.fecha : null,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error consultando TCC guía ${guia}:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
}
