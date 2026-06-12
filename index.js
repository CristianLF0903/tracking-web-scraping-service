import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    const addr = server.address();
    const host = addr && addr.address && (addr.address === '::' || addr.address === '0.0.0.0') ? 'localhost' : (addr && addr.address) || 'localhost';
    const port = (addr && addr.port) || PORT;
    const baseUrl = process.env.SERVICE_URL || `http://${host}:${port}`;

    console.log(`🚀 Servidor corriendo en ${baseUrl}`);
    console.log(`   Health check: ${baseUrl}/health`);
    console.log(`   Tracking API: ${baseUrl}/api/tracking`);
});
