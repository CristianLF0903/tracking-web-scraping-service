import { launchBrowser } from "../utils/browser.js";
import { TCC_URL_BASE } from "../config/constants.js";

/**
 * Normaliza los estados de TCC desde 17track.net
 */
function normalizarEstadoTCC(estado) {
  const e = estado.toLowerCase().trim();

  if (e.includes("entregado")) {
    return "Entregado";
  }

  if (e.includes("recogid") || e.includes("programado")) {
    return "Enviado";
  }

  return "En camino";
}

/**
 * Consulta el tracking de TCC a través de 17track.net
 * @param {string} guia - Número de guía de TCC
 */
export async function consultarGuiaTCC(guia) {
  let browser = null;

  try {
    // Usar la utilidad estándar con Stealth
    browser = await launchBrowser({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navegar directamente a la página de rastreo de la guía
    const directUrl = `https://t.17track.net/es#nums=${guia}&fc=101181`;
    console.log(`[TCC] Navegando a: ${directUrl}`);
    
    await page.goto(directUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // 1. Cerrar el tooltip inicial si aparece
    try {
      const tooltipCloseSelector = "button.tooltip__close";
      await page.waitForSelector(tooltipCloseSelector, { timeout: 10000 });
      await page.click(tooltipCloseSelector);
      console.log("[TCC] Tooltip cerrado");
    } catch (e) {
      console.log("[TCC] No se encontró tooltip o ya estaba cerrado");
    }

    // 2. Esperar a que los resultados se carguen y aparezcan
    // El selector proporcionado por el usuario para el bloque de estado
    const resultBlockSelector = ".flex-1.min-w-0.px-2.cursor-pointer.text-sm.text-zinc-900";
    
    // 17track puede tardar un poco en procesar, aumentamos el timeout
    await page.waitForSelector(resultBlockSelector, { timeout: 45000 });

    // Espera adicional de seguridad para asegurar que el contenido se renderice completamente
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 4. Extraer el estado y la fecha del primer elemento (más reciente)
    const trackingData = await page.evaluate((selector) => {
      const clean = (txt) => (txt ? txt.trim().replace(/\s+/g, " ") : null);
      
      const resultBlock = document.querySelector(selector);
      if (!resultBlock) return null;

      // Según el HTML: <div>fecha</div> y luego <div><span>estado</span></div>
      const dateElement = resultBlock.querySelector("div:first-child");
      const statusElement = resultBlock.querySelector("span.flex-1");

      return {
        fecha: dateElement ? clean(dateElement.textContent) : null,
        estado: statusElement ? clean(statusElement.textContent) : null,
      };
    }, resultBlockSelector);

    if (trackingData && trackingData.estado) {
      console.log("[TCC Debug] Datos extraídos:", trackingData);
      const estadoNormalizado = normalizarEstadoTCC(trackingData.estado);
      
      // Esperar un poco para que el usuario vea el resultado en el navegador
      await new Promise(resolve => setTimeout(resolve, 10000));

      return {
        estadoActual: estadoNormalizado,
        estadoOriginal: trackingData.estado,
        fechaActualizacion: trackingData.fecha,
        fechaEnvio: null,
        fechaEntrega: estadoNormalizado === "Entregado" ? trackingData.fecha : null,
      };
    } else {
      console.warn(`[TCC] No se encontró información de tracking para la guía ${guia}`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      return null;
    }

  } catch (error) {
    console.error(`[TCC] Error consultando guía ${guia} en 17track:`, error.message);
    await new Promise(resolve => setTimeout(resolve, 10000));
    return null;
  } finally {
    if (browser) {
      // Comentado para depuración manual si es necesario
      await browser.close();
    }
  }
}
