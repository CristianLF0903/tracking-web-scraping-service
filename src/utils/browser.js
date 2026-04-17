import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * Lanza una instancia de navegador Puppeteer configurada según el entorno.
 * En producción (Vercel/Lambda) utiliza @sparticuz/chromium.
 * En desarrollo utiliza el puppeteer estándar.
 */
export async function launchBrowser() {
    // Detección de entorno de producción (Vercel, AWS Lambda, o variable de entorno)
    const isProduction = 
        process.env.NODE_ENV === 'production' || 
        process.env.VERCEL === '1' || 
        process.env.AWS_EXECUTION_ENV ||
        process.env.LAMBDA_TASK_ROOT;

    console.log(`[Browser] Iniciando navegador en modo: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);

    if (isProduction) {
        try {
            return await puppeteerCore.launch({
                args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            });
        } catch (error) {
            console.error('[Browser] Error al lanzar puppeteer-core en producción:', error.message);
            // Fallback al puppeteer normal por si acaso
        }
    }

    // Configuración para desarrollo local
    return await puppeteer.launch({
        headless: "new", // "new" es el modo recomendado en versiones recientes
        args: [
            "--no-sandbox", 
            "--disable-setuid-sandbox", 
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled", // Ayuda a evadir detección de bots
            "--window-size=1920,1080"
        ],
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    });
}
