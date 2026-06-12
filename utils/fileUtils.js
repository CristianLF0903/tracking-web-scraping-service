import fs from 'fs';
import path from 'path';

export function readGuides(filePath) {
    try {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error(`Error reading file at ${filePath}:`, error.message);
        throw error;
    }
}

export function exportToTxt(data, filePath) {
    if (!data || data.length === 0) {
        console.log("No hay datos para exportar.");
        return;
    }

    try {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','), // Header row
            ...data.map(row => headers.map(fieldName => {
                let cell = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
                 // Escape commas and quotes if necessary
                 if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                     cell = `"${cell.replace(/"/g, '""')}"`;
                 }
                 return cell;
            }).join(','))
        ].join('\n');

        fs.writeFileSync(filePath, csvContent, 'utf-8');
        console.log(`Resultados exportados a: ${filePath}`);
    } catch (error) {
        console.error(`Error al exportar archivo: ${error.message}`);
    }
}
