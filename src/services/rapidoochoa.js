import { launchBrowser } from "../utils/browser.js";
import { RAPIDOOCHOA_URL_BASE } from "../config/constants.js";

function normalizarEstadoRapidoOchoa(estado) {
  const e = estado.toUpperCase().trim();

  if (e === "GUIA ELABORADA") return "Enviado";
  if (e === "ENTREGADA" || e.includes("FACTURAR")) return "Recibido";

  return "En camino";
}

export async function consultarGuiaRapidoOchoa(guia) {
  let browser = null;

  try {
    browser = await launchBrowser();

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // 1. Navegar a la página principal
    await page.goto(RAPIDOOCHOA_URL_BASE, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // 2. Hacer click en la pestaña "Rastreo de envios"
    await page.waitForSelector('li[data-index="1"]', { timeout: 15000 });
    await page.click('li[data-index="1"]');

    // Esperar a que el formulario de rastreo sea visible
    await page.waitForSelector(
      'input[id="tabpane:form_entrega:codigoguia"]',
      { timeout: 10000 },
    );

    // 3. Limpiar el campo, ingresar la guía y presionar Enter
    const inputSelector = 'input[id="tabpane:form_entrega:codigoguia"]';
    await page.click(inputSelector, { clickCount: 3 }); // Seleccionar todo el texto existente
    await page.type(inputSelector, guia, { delay: 50 });
    await page.keyboard.press("Enter");

    // 4. Esperar a que la tabla de resultados se cargue
    // Esperamos a que aparezcan filas en la tabla de rastreo
    await page
      .waitForSelector(
        "#tabpane\\:form_entrega\\:j_idt107_data tr",
        { timeout: 20000 },
      )
      .catch(() => {
        console.warn(
          `[RapidoOchoa] Timeout esperando resultados para guía ${guia}`,
        );
      });

    // Espera adicional para asegurar que todos los datos se rendericen
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. Extraer datos de la última fila de la tabla
    const trackingData = await page.evaluate(() => {
      const rows = document.querySelectorAll(
        "#tabpane\\:form_entrega\\:j_idt107_data tr",
      );

      if (rows.length === 0) return null;

      const lastRow = rows[rows.length - 1];
      const cells = lastRow.querySelectorAll("td");

      if (cells.length < 2) return null;

      // Columna 0: Fecha, Columna 1: Detalle
      const fechaLabel = cells[0]?.querySelector("label");
      const detalleLabel = cells[1]?.querySelector("label");

      const fecha = fechaLabel ? fechaLabel.textContent.trim() : null;
      const detalle = detalleLabel ? detalleLabel.textContent.trim() : null;

      return { fecha, detalle };
    });

    await browser.close();
    browser = null;

    if (trackingData && trackingData.detalle) {
      const estadoNormalizado = normalizarEstadoRapidoOchoa(
        trackingData.detalle,
      );
      return {
        estadoActual: estadoNormalizado,
        estadoOriginal: trackingData.detalle,
        fechaActualizacion: trackingData.fecha,
        fechaEnvio: null,
        fechaEntrega:
          estadoNormalizado === "Recibido" ? trackingData.fecha : null,
      };
    } else {
      console.warn(
        `[RapidoOchoa] No tracking details found for guide ${guia}`,
      );
      return null;
    }
  } catch (error) {
    console.error(
      `Error consulting RapidoOchoa guide ${guia}:`,
      error.message,
    );
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
