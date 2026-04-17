import { consultarGuiaSolex } from '../src/services/solex.js';
import { exportToTxt } from '../src/utils/fileUtils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function test() {
    console.log("Testing Solexapp Guide: 3185023373");
    const result = await consultarGuiaSolex('3185023373');
    console.log("Result:", result);

    if (result) {
        console.log("Testing Export...");
        const data = [{
            Guia: '3185023373',
            Transportadora: 'solexapp',
            ...result
        }];
        const exportPath = path.join(__dirname, '../assets/test_export.txt');
        exportToTxt(data, exportPath);
        console.log("Export test complete.");
    } else {
        console.error("Failed to fetch Solexapp data.");
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    test();
}
