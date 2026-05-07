import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * Lanza una instancia de navegador Puppeteer configurada según el entorno.
 * En producción (Vercel/Lambda) utiliza @sparticuz/chromium.
 * En desarrollo utiliza el puppeteer estándar.
 */
export async function launchBrowser() {
    // 1. Prioridad: Browserless.io (si está configurado en .env)
    const browserlessEndpoint = process.env.BROWSERLESS_WS_ENDPOINT;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;

    if (browserlessEndpoint && browserlessToken) {
        console.log(`[Browser] Conectando a Browserless.io...`);
        try {
            const wsUrl = `${browserlessEndpoint}?token=${browserlessToken}`;
            return await puppeteer.connect({
                browserWSEndpoint: wsUrl,
                defaultViewport: { width: 1920, height: 1080 }
            });
        } catch (error) {
            console.error('[Browser] Error al conectar con Browserless.io:', error.message);
            // Si falla, continuamos con los otros métodos
        }
    }

    // 2. Detección de entorno de producción (Vercel, AWS Lambda, o variable de entorno)
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
        }
    }

    // 3. Configuración para desarrollo local
    return await puppeteer.launch({
        headless: "new",
        args: [
            "--no-sandbox", 
            "--disable-setuid-sandbox", 
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--window-size=1920,1080"
        ],
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    });
}
