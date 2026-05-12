import puppeteer from 'puppeteer';
import { TCC_URL_BASE } from "../config/constants.js";

/**
 * Normaliza los estados de TCC desde 17track.net
 */
function normalizarEstadoTCC(estado) {
  const e = estado.toLowerCase().trim();

  if (e.includes("entregado")) {
    return "Recibido";
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
    // ACTIVAR NAVEGADOR VISIBLE PARA DEPURACIÓN
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--window-size=1920,1080"]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Configurar un user agent moderno para evitar bloqueos básicos
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navegar a la página de TCC en 17track
    await page.goto(TCC_URL_BASE, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // 1. Ingresar la guía en el textarea
    const textareaSelector = "#auto-size-textarea";
    await page.waitForSelector(textareaSelector, { timeout: 15000 });
    await page.type(textareaSelector, guia, { delay: 50 });

    // 2. Hacer clic en el botón de rastrear
    // Usamos el selector de clase que identifica al botón "Rastrear"
    const btnSelector = ".batch_track_search-area-bottom__MV_vI";
    await page.waitForSelector(btnSelector, { timeout: 10000 });
    await page.click(btnSelector);

    // 3. Esperar a que los resultados se carguen y aparezcan
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
        fechaEntrega: estadoNormalizado === "Recibido" ? trackingData.fecha : null,
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
