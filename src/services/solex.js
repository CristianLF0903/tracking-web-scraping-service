import axios from 'axios';

const ESTADOS_MAP = {
    'GUIA CREADA': 'Enviado',
    'EN BODEGA ORIGEN': 'En camino',
    'GUIA EN VIAJE TRONCAL': 'En camino',
    'EN BODEGA DESTINO': 'En camino',
    'GUIA EN REPARTO': 'En camino',
    'ENTREGA EXXE': 'Recibido'
};

function normalizarEstado(estado) {
    return ESTADOS_MAP[estado] || estado;
}

export async function consultarGuiaSolex(numeroGuia) {
    const url = `https://solexapp.exxe.com.co/SolexRC/g?Numero=${numeroGuia}`;

    try {
        const response = await axios.get(url);
        const html = response.data;

        const regex = /entradaEstado\s*\(\s*'[^']+',\s*'([^']+)',\s*'([^']+)'\s*\)/g;
        
        let match;
        let lastMatch = null;

        while ((match = regex.exec(html)) !== null) {
            lastMatch = match;
        }

        if (lastMatch) {
            const cleanDate = lastMatch[1].replace(/&#160;/g, ' ').replace(/&nbsp;/g, ' ');
            const cleanStatus = lastMatch[2].replace(/&#160;/g, ' ').replace(/&nbsp;/g, ' ');

            return {
                estadoActual: normalizarEstado(cleanStatus),
                estadoOriginal: cleanStatus,
                fechaActualizacion: cleanDate,
                fechaEnvio: null, // Solex no parece dar fecha de envío explícita en el mismo formato
                fechaEntrega: cleanStatus === 'ENTREGA EXXE' ? cleanDate : null
            };
        }
        
        return null;

    } catch (error) {
        console.error(`Error consultando Solex guía ${numeroGuia}:`, error.message);
        return null;
    }
}
