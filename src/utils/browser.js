import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chromium from '@sparticuz/chromium';
import playwright from 'playwright';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let Camoufox;
try {
    // Camoufox a veces tiene problemas de importación directa en ESM
    const camoufoxModule = require('camoufox');
    Camoufox = camoufoxModule.Camoufox;
} catch (e) {
    console.warn('[Browser] Camoufox no pudo cargarse, se usará Playwright Firefox estándar como respaldo:', e.message);
}

// Registrar el plugin de stealth globalmente para Puppeteer
puppeteerExtra.use(StealthPlugin());

/**
 * Lanza una instancia de navegador Puppeteer configurada según el entorno.
 */
export async function launchBrowser(options = {}) {
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
        }
    }

    const isProduction = 
        process.env.NODE_ENV === 'production' || 
        process.env.VERCEL === '1' || 
        process.env.AWS_EXECUTION_ENV ||
        process.env.LAMBDA_TASK_ROOT;

    if (isProduction) {
        try {
            return await puppeteerCore.launch({
                args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
                ...options
            });
        } catch (error) {
            console.error('[Browser] Error al lanzar puppeteer-core en producción:', error.message);
        }
    }

    console.log(`[Browser] Iniciando Puppeteer con Stealth...`);
    return await puppeteerExtra.launch({
        headless: "new",
        args: [
            "--no-sandbox", 
            "--disable-setuid-sandbox", 
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled"
        ],
        defaultViewport: { width: 1920, height: 1080 },
        ...options
    });
}

/**
 * Lanza una instancia de Camoufox o Playwright Firefox (mismo API)
 */
export async function launchCamoufox(options = {}) {
    const isHeadless = options.headless !== undefined ? options.headless : true;

    if (Camoufox) {
        console.log(`[Browser] Iniciando Camoufox (Playwright Stealth)...`);
        try {
            return await Camoufox({
                headless: isHeadless,
                ...options
            });
        } catch (error) {
            console.error('[Browser] Error al lanzar Camoufox, intentando Playwright Firefox:', error.message);
        }
    }

    // Respaldo a Playwright Firefox estándar (mismo API que Camoufox)
    console.log(`[Browser] Iniciando Playwright Firefox...`);
    return await playwright.firefox.launch({
        headless: isHeadless,
        ...options
    });
}
