const fs = require('fs');

// Replicate the exact parsing from script.js
function parseCSVRows(text) {
    const rows = [];
    let currentRow = [], currentField = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i], nx = text[i + 1];
        if (inQuotes) {
            if (ch === '"' && nx === '"') { currentField += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else currentField += ch;
        } else {
            if (ch === '"') inQuotes = true;
            else if (ch === ',') { currentRow.push(currentField.trim()); currentField = ''; }
            else if (ch === '\n' && nx !== undefined) { currentRow.push(currentField.trim()); if (currentRow.length) rows.push(currentRow); currentRow = []; currentField = ''; }
            else if (ch === '\r') {}
            else currentField += ch;
        }
    }
    currentRow.push(currentField.trim());
    if (currentRow.length) rows.push(currentRow);
    return rows;
}

function normalizeHeader(h) {
    return h.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ');
}

const csvText = fs.readFileSync('products.csv', 'utf-8');
const rows = parseCSVRows(csvText);
console.log('Total rows (including header):', rows.length);

const headers = rows[0].map(normalizeHeader);
console.log('Headers:', headers);
console.log('Column count:', headers.length);

for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const raw = {};
    headers.forEach((h, idx) => { raw[h] = (values[idx] || '').trim(); });
    
    const name = raw['Name'] || 'UNKNOWN';
    const hasGtin = raw['GTIN'] ? 'YES' : 'NO';
    const fieldCount = values.length;
    
    console.log(`Row ${i}: ${name} | GTIN: ${hasGtin} | Fields: ${fieldCount}`);
    
    if (fieldCount !== headers.length) {
        console.log(`  *** FIELD COUNT MISMATCH! Expected ${headers.length}, got ${fieldCount}`);
        console.log(`  Values: ${JSON.stringify(values)}`);
    }
}