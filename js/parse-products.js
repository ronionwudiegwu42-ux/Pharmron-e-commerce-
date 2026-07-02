// Function to fetch and parse the CSV file
async function fetchAndParseCSV() {
    try {
        const response = await fetch('products.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvData = await response.text();
        const products = parseCSV(csvData);
        verifyImagePaths(products);
        return products;
    } catch (error) {
        console.error('Error fetching or parsing CSV:', error);
        return [];
    }
}

// Proper CSV parser that handles quoted fields with commas and newlines
function parseCSV(csvData) {
    const rows = parseCSVRows(csvData);
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    const products = [];
    
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        const rawProduct = {};
        
        for (let j = 0; j < headers.length; j++) {
            rawProduct[headers[j]] = values[j] || '';
        }
        
        // Map CSV column names to our expected field names
        const category = rawProduct['Category'] || rawProduct['Category '] || '';
        
        const mappedProduct = {
            name: rawProduct['Name'] || '',
            category: category,
            price: rawProduct['Price'] || '',
            gtin: rawProduct['GTIN'] || '',
            imagePath: fixImagePath(rawProduct['image_url'] || ''),
            paystackLink: rawProduct['Paystack _url'] || rawProduct['Paystack_url'] || '',
            whatsappMessage: rawProduct['Whatapp_text'] || rawProduct['Whatsapp_text'] || '',
            problem: rawProduct['Problem'] || rawProduct['Problem '] || '',
            solution: rawProduct['Solution'] || rawProduct['Solution '] || '',
            type: category.includes('Signature') ? 'Signature' : 'Partner'
        };
        
        products.push(mappedProduct);
    }
    
    return products;
}

// Parses CSV text into an array of rows (each row is an array of values)
function parseCSVRows(text) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                // Escaped quote inside quoted field
                currentField += '"';
                i++; // skip the next quote
            } else if (char === '"') {
                // End of quoted field
                inQuotes = false;
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                // Start of quoted field
                inQuotes = true;
            } else if (char === ',') {
                // End of field
                currentRow.push(currentField.trim());
                currentField = '';
            } else if (char === '\n' && nextChar !== undefined) {
                // End of row (but not the very last line)
                currentRow.push(currentField.trim());
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
            } else if (char === '\r') {
                // Skip carriage returns
            } else {
                currentField += char;
            }
        }
    }
    
    // Handle the last field and row
    currentRow.push(currentField.trim());
    if (currentRow.length > 0) {
        rows.push(currentRow);
    }
    
    return rows;
}

// Fix image paths: replace .pmg with .png and ensure path is correct
function fixImagePath(path) {
    if (!path) return '';
    path = path.replace(/\.pmg$/i, '.png');
    path = path.replace('Turmeric-capsules', 'Turmeric-capsule');
    if (!path.startsWith('images/')) {
        path = 'images/' + path;
    }
    return path;
}

// Function to verify image paths
function verifyImagePaths(products) {
    products.forEach(product => {
        const imagePath = product.imagePath;
        if (imagePath) {
            const img = new Image();
            img.src = imagePath;
            img.onload = () => console.log(`Image found: ${imagePath}`);
            img.onerror = () => console.error(`Image not found: ${imagePath}`);
        } else {
            console.error(`No image path specified for product: ${product.name}`);
        }
    });
}

// This script is loaded by index.html and exposes fetchAndParseCSV globally.