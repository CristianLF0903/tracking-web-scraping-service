import { consultarGuiaAldia } from '../src/services/aldia.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

export async function test() {
    try {
        console.log("Testing Aldia Service...");
        const guia = "222602956225";
        const result = await consultarGuiaAldia(guia);
        console.log("Result:", result);
        
        fs.writeFileSync('test_output.json', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error:", error);
        fs.writeFileSync('test_error.txt', error.toString());
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    test();
}
