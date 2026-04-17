import { consultarGuiaCoordinadora } from '../src/services/coordinadora.js';
import { exportToTxt } from '../src/utils/fileUtils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function test() {
    console.log("Testing Coordinadora Guide: 34140081480");
    const result = await consultarGuiaCoordinadora('34140081480');
    console.log("Result:", result);

    if (result) {
        console.log("Testing Export...");
        const data = [{
            Guia: '34140081480',
            Transportadora: 'coordinadora',
            ...result
        }];
        const exportPath = path.join(__dirname, '../assets/test_export_coordinadora.txt');
        exportToTxt(data, exportPath);
        console.log("Export test complete.\n");
    } else {
        console.error("Failed to fetch Coordinadora data.\n");
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    test();
}
