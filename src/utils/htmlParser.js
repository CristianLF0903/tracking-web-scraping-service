import * as cheerio from 'cheerio';

/**
 * Parsea el HTML del timeline de Transprensa y devuelve una lista estructurada de eventos.
 * @param {string} html - El HTML crudo del timeline (.cbp_tmtimeline).
 * @returns {Array} - Lista de objetos { fecha, estado }.
 */
export function parseTransprensaTimeline(html) {
    if (!html) return [];
    
    const $ = cheerio.load(html);
    const items = [];

    // BrowserQL puede devolver solo los elementos <li> si se usa el selector específico.
    // Buscamos todos los <li> presentes en el fragmento.
    $('li').each((_, li) => {
        const spans = $(li).find('.cbp_tmtime span');
        // El formato esperado es:
        // span[0]: "Fecha y Hora"
        // span[1]: "YYYY/MM/DD"
        // span[2]: "HH:MM:SS"
        const date = $(spans[1]).text().trim();
        const time = $(spans[2]).text().trim();
        const status = $(li).find('.cbp_tmlabel h2').text().trim();

        if (date || status) {
            items.push({
                fecha: `${date} ${time}`.trim(),
                estado: status,
            });
        }
    });

    return items;
}
