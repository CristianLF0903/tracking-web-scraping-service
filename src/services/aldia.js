import axios from 'axios';
import { ALDIA_URL_BASE } from '../config/constants.js';

function normalizarEstadoAldia(estado) {
    const e = estado.toLowerCase();
    if (e.includes('generada') || e.includes('registrada')) return 'Enviado';
    if (e.includes('entregado') || e.includes('cumplido')) return 'Recibido';
    return 'En camino';
}

export async function consultarGuiaAldia(guia) {
    if (!guia || isNaN(Number(guia))) {
        console.warn(`⚠️ Guía vacía o no numérica: ${guia}`);
        return null;
    }

    const url = `${ALDIA_URL_BASE}${guia}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = response.data;

        const cajaMatch = html.match(/<div[^>]*class=["'][^"']*col-lg-4\s+caja1\s+stdentre[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
        
        if (!cajaMatch) {
            return null;
        }
        
        const cajaContent = cajaMatch[1];
        const h1Match = cajaContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        
        if (!h1Match) {
             return null;
        }

        const textoH1 = h1Match[1]
            .replace(/<[^>]+>/g, '') 
            .replace(/\s+/g, ' ')    
            .trim();

        const estadoNormalizado = normalizarEstadoAldia(textoH1);

        return {
            estadoActual: estadoNormalizado,
            estadoOriginal: textoH1,
            fechaActualizacion: null, // Aldía no parece dar fecha de actualización específica en este bloque
            fechaEnvio: null,
            fechaEntrega: estadoNormalizado === 'Recibido' ? 'Consultar detalles' : null
        };

    } catch (error) {
        console.error(`Error consultando la guía Aldia ${guia}:`, error.message);
        return null; 
    }
}
