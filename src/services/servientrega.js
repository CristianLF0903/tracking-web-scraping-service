import axios from 'axios';
import { SERVIENTREGA_API_URL, MOCK_USER_ID, MOCK_COUNTRY_ID, LANGUAGE } from '../config/constants.js';

function normalizarEstadoServientrega(estado) {
    const e = estado.toLowerCase();
    if (e.includes('en proceso') || e.includes('recolectado')) return 'Enviado';
    if (e.includes('entregado')) return 'Recibido';
    return 'En camino';
}

export async function consultarGuia(numeroGuia) {
    const payload = {
        numeroGuia: numeroGuia,
        idValidacionUsuario: MOCK_USER_ID,
        tipoDatoValidar: MOCK_USER_ID,
        datoRespuestaUsuario: MOCK_USER_ID,
        idpais: MOCK_COUNTRY_ID,
        lenguaje: LANGUAGE
    };

    try {
        const response = await axios.post(SERVIENTREGA_API_URL, payload, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = response.data;

        if (!data.Results || data.Results.length === 0) {
            return null;
        }

        const resultado = data.Results[0];
        const estadoNormalizado = normalizarEstadoServientrega(resultado.estadoActual);

        return {
            estadoActual: estadoNormalizado,
            estadoOriginal: resultado.estadoActual,
            fechaActualizacion: resultado.fechaRealEntrega || resultado.fechaEnvio || null,
            fechaEnvio: resultado.fechaEnvio,
            fechaEntrega: resultado.fechaRealEntrega || null
        };

    } catch (error) {
        console.error(`Error consultando la guía ${numeroGuia}:`, error.message);
        return null;
    }
}
