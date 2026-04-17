import puppeteer from 'puppeteer';
import { COORDINADORA_URL_BASE } from '../config/constants.js';

function normalizarEstadoCoordinadora(estado) {
    const e = estado.toLowerCase();
    if (e.includes('en terminal origen')) return 'Enviado';
    if (e.includes('entregado')) return 'Recibido';
    
    const enCaminoCasos = ['en transporte', 'en terminal destino', 'en reparto'];
    if (enCaminoCasos.some(caso => e.includes(caso))) {
        return 'En camino';
    }
    
    return 'En camino'; // Default por defecto según el patrón de otros servicios
}

export async function consultarGuiaCoordinadora(guia) {
    const url = `${COORDINADORA_URL_BASE}${guia}`;
    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        await page.waitForSelector('.detail.active', { timeout: 10000 }).catch(() => {
            console.warn(`Timeout waiting for tracking details for guide ${guia}`);
        });

        const trackingData = await page.evaluate(() => {
            const detailElements = document.querySelectorAll('.detail.active');
            
            if (detailElements.length === 0) {
                return null;
            }

            const lastDetail = detailElements[detailElements.length - 1];
            
            const dateElement = lastDetail.querySelector('.date');
            const descriptionElement = lastDetail.querySelector('.description');
            
            if (!dateElement || !descriptionElement) {
                return null;
            }

            return {
                date: dateElement.textContent.trim(),
                description: descriptionElement.textContent.trim()
            };
        });

        await browser.close();
        browser = null;

        if (trackingData) {
            const estadoNormalizado = normalizarEstadoCoordinadora(trackingData.description);
            return {
                estadoActual: estadoNormalizado,
                estadoOriginal: trackingData.description,
                fechaActualizacion: trackingData.date,
                fechaEnvio: null, 
                fechaEntrega: estadoNormalizado === 'Recibido' ? trackingData.date : null
            };
        } else {
            console.warn(`No tracking details found for Coordinadora guide ${guia}`);
            return null;
        }

    } catch (error) {
        console.error(`Error consulting Coordinadora guide ${guia}:`, error.message);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
