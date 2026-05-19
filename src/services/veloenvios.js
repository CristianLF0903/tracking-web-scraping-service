import { launchBrowser } from "../utils/browser.js";
import { VELOENVIOS_URL_BASE } from "../config/constants.js";

/**
 * Normaliza el estado de la guía según el texto y la sección del timeline.
 */
function normalizarEstadoVeloenvios(estadoTexto) {
  const e = estadoTexto.toLowerCase();

  // ── ENTREGA ──
  if (e.includes("entregada") || e.includes("entregado")) {
    return "Entregado";
  }

  // ── INGRESO ──
  if (e.includes("recogida") || e.includes("ingreso a bodega")) {
    return "Enviado";
  }

  // ── TRANSPORTE / OTROS ──
  if (e.includes("transporte") || e.includes("reparto") || e.includes("despacho")) {
    return "En camino";
  }

  return "En camino"; // Default
}

export async function consultarGuiaVeloenvios(guia) {
  let browser = null;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // 1. Navegar a la página de Veloenvios
    await page.goto(VELOENVIOS_URL_BASE, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // 2. Ingresar la guía y consultar
    await page.waitForSelector("#form_codigoGuia", { timeout: 15000 });
    await page.type("#form_codigoGuia", guia, { delay: 50 });

    // El botón #form_btnConsulta realiza un submit tradicional
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => null),
      page.click("#form_btnConsulta"),
    ]);

    // 3. Esperar a que el timeline sea visible
    await page.waitForSelector(".timeline", { timeout: 15000 }).catch(() => {
      console.warn(`[Veloenvios] Timeline no encontrado para la guía ${guia}`);
    });

    // 4. Extraer datos del timeline con lógica de prioridad por sección
    const result = await page.evaluate(() => {
      const body = document.querySelector(".tm-body");
      if (!body) return null;

      const getSectionItems = (titleText) => {
        const titles = Array.from(document.querySelectorAll(".tm-title h3"));
        const title = titles.find(h => h.textContent.trim().toUpperCase() === titleText);
        if (!title) return null;
        
        let nextEl = title.parentElement.nextElementSibling;
        while (nextEl && nextEl.tagName !== 'OL') {
          nextEl = nextEl.nextElementSibling;
        }
        return nextEl ? Array.from(nextEl.querySelectorAll("li")) : null;
      };

      let status = "";
      let dateUpdate = "";
      let firstDate = "";

      // ── 1. INGRESO (Punto de partida) ──
      const ingresoItems = getSectionItems("INGRESO");
      if (ingresoItems && ingresoItems.length > 0) {
        const firstItem = ingresoItems[0];
        firstDate = firstItem.querySelector(".tm-datetime-date")?.textContent.trim() || "";
        
        const lastIngreso = ingresoItems[ingresoItems.length - 1];
        status = lastIngreso.querySelector(".tm-box p")?.textContent.trim() || "";
        const d = lastIngreso.querySelector(".tm-datetime-date")?.textContent.trim() || "";
        const t = lastIngreso.querySelector(".tm-datetime-time")?.textContent.trim() || "";
        dateUpdate = `${d} ${t}`.trim();
      }

      // ── 2. TRANSPORTE (Sobrecribe si hay datos) ──
      const transporteItems = getSectionItems("TRANSPORTE");
      if (transporteItems) {
        for (const item of transporteItems) {
          const rows = Array.from(item.querySelectorAll("table tbody tr"));
          if (rows.length > 0) {
            const lastRow = rows[rows.length - 1];
            const cells = lastRow.querySelectorAll("td");
            if (cells.length >= 3) {
              status = cells[2].textContent.trim();
              dateUpdate = cells[1].textContent.trim();
            }
          }
        }
      }

      // ── 3. ENTREGA (Máxima prioridad) ──
      const entregaItems = getSectionItems("ENTREGA");
      if (entregaItems) {
        const validEntrega = entregaItems.find(item => {
          const d = item.querySelector(".tm-datetime-date")?.textContent.trim();
          return d && d !== "N/A" && d !== "";
        });
        
        if (validEntrega) {
          status = validEntrega.querySelector(".tm-box p")?.textContent.trim() || status;
          const d = validEntrega.querySelector(".tm-datetime-date")?.textContent.trim();
          const t = validEntrega.querySelector(".tm-datetime-time")?.textContent.trim();
          dateUpdate = `${d} ${t}`.trim();
        }
      }

      return {
        estadoOriginal: status,
        fechaActualizacion: dateUpdate,
        fechaEnvio: firstDate
      };
    });

    await browser.close();
    browser = null;

    if (result && result.estadoOriginal) {
      const estadoNormalizado = normalizarEstadoVeloenvios(result.estadoOriginal);
      
      return {
        estadoActual: estadoNormalizado,
        estadoOriginal: result.estadoOriginal,
        fechaActualizacion: result.fechaActualizacion,
        fechaEnvio: result.fechaEnvio || null,
        fechaEntrega: estadoNormalizado === "Entregado" ? result.fechaActualizacion : null,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error consultando Veloenvios para la guía ${guia}:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
