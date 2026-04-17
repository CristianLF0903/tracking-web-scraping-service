import { launchBrowser } from '../src/utils/browser.js';

async function testBrowser() {
    console.log('--- Probando utilidad de navegador ---');
    let browser = null;
    try {
        browser = await launchBrowser();
        const page = await browser.newPage();
        await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
        const title = await page.title();
        console.log('✅ Navegador iniciado correctamente.');
        console.log(`✅ Título de página de prueba: ${title}`);
        
        const isProduction = 
            process.env.NODE_ENV === 'production' || 
            process.env.VERCEL === '1' || 
            process.env.AWS_EXECUTION_ENV ||
            process.env.LAMBDA_TASK_ROOT;
            
        console.log(`ℹ️ Entorno detectado: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
        
    } catch (error) {
        console.error('❌ Error probando el navegador:', error);
    } finally {
        if (browser) await browser.close();
    }
}

testBrowser();
