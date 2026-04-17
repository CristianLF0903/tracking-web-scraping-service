import { Router } from 'express';
import { consultarGuia } from '../services/servientrega.js';
import { consultarGuiaAldia } from '../services/aldia.js';
import { consultarGuiaSolex } from '../services/solex.js';
import { consultarGuiaCoordinadora } from '../services/coordinadora.js';

const router = Router();

// ─── Helper: despachar consulta según transportadora ──────────────────────────
async function consultarPorTransportadora(guia, transportadora) {
    switch (transportadora) {
        case 'servientrega': return consultarGuia(guia);
        case 'aldia':        return consultarGuiaAldia(guia);
        case 'solexapp':     return consultarGuiaSolex(guia);
        case 'coordinadora': return consultarGuiaCoordinadora(guia);
        default:             return null;
    }
}

// ─── GET /api/tracking/:guia/:transportadora ─────────────────────────────────
// Consulta una sola guía específica.
router.get('/:guia/:transportadora', async (req, res) => {
    const { guia, transportadora } = req.params;

    const transportadorasValidas = ['servientrega', 'aldia', 'solexapp', 'coordinadora'];
    if (!transportadorasValidas.includes(transportadora)) {
        return res.status(400).json({
            success: false,
            message: `Transportadora inválida. Valores aceptados: ${transportadorasValidas.join(', ')}`,
        });
    }

    try {
        const infoGuia = await consultarPorTransportadora(guia, transportadora);

        if (!infoGuia) {
            return res.status(404).json({
                success: false,
                message: `No se encontró información para la guía ${guia} en ${transportadora}.`,
            });
        }

        return res.json({
            success: true,
            data: {
                guia,
                transportadora,
                ...infoGuia,
            },
        });
    } catch (error) {
        console.error(`Error en GET /api/tracking/${guia}/${transportadora}:`, error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
