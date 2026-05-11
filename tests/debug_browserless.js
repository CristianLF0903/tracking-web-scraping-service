import 'dotenv/config';
import puppeteer from 'puppeteer';

async function debugBrowserless() {
    console.log('--- Depuración de Conexión a Browserless.io ---');
    
    const endpoint = process.env.BROWSERLESS_WS_ENDPOINT;
    const token = process.env.BROWSERLESS_TOKEN;

    if (!endpoint || !token) {
        console.error('❌ Error: BROWSERLESS_WS_ENDPOINT o BROWSERLESS_TOKEN no están definidos en el archivo .env');
        return;
    }

    console.log(`ℹ️ Endpoint: ${endpoint}`);
    console.log(`ℹ️ Token: ${token.substring(0, 5)}...${token.substring(token.length - 4)}`);

    let browser = null;
    try {
        const wsUrl = `${endpoint}?token=${token}`;
        console.log('⏳ Conectando...');
        
        browser = await puppeteer.connect({
            browserWSEndpoint: wsUrl,
            defaultViewport: { width: 1280, height: 720 }
        });

        console.log('✅ ¡Conexión exitosa!');
        
        const version = await browser.version();
        console.log(`✅ Versión del navegador remoto: ${version}`);

        const page = await browser.newPage();
        console.log('⏳ Probando navegación a Google...');
        
        await page.goto('https://www.google.com', { waitUntil: 'networkidle2', timeout: 30000 });
        const title = await page.title();
        
        console.log(`✅ Navegación exitosa. Título: "${title}"`);
        
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        if (error.message.includes('401')) {
            console.error('👉 Tip: El token de Browserless.io parece ser inválido.');
        } else if (error.message.includes('403')) {
            console.error('👉 Tip: Acceso prohibido. Revisa las restricciones de tu cuenta en Browserless.');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error('👉 Tip: No se pudo establecer conexión con el servidor. Revisa el endpoint.');
        }
    } finally {
        if (browser) {
            console.log('⏳ Cerrando conexión...');
            await browser.close();
            console.log('👋 Conexión cerrada.');
        }
    }
}

debugBrowserless();
