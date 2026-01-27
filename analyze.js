const XLSX = require('xlsx');
const fs = require('fs');

try {
  console.log('Reading Check_item.xlsx...');
  const workbook = XLSX.readFile('Check_item.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert to JSON array of arrays to inspect manually
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Total rows found:', data.length);

  // Identify Header Row (Look for 'Mã hàng' or similar)
  let headerRowIndex = -1;
  let codeColIndex = -1;

  for(let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i] || [];
    // Normalize row strings to search
    const normalizedRow = row.map(c => String(c || '').toLowerCase().trim());
    
    // Search for column containing 'mahang' or 'mã hàng'
    const idx = normalizedRow.findIndex(s => s.includes('mahang') || s.includes('mã hàng') || s.includes('m hng'));
    
    if (idx >= 0) {
      headerRowIndex = i;
      codeColIndex = idx;
      console.log('Found Header at row:', i, 'Column Index:', idx);
      break;
    }
  }

  if (codeColIndex === -1) {
    console.log('Could not find Column "Mã hàng"');
    process.exit(1);
  }

  const normalizedCounts = {};
  let dupCount = 0;

  // Start data from header + 1 
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] || [];
    const rawCode = String(row[codeColIndex] || '').trim();
    
    // Skip empty codes or re-repeated headers or irrelevant lines
    if (!rawCode || rawCode.toLowerCase().includes('mã hàng') || rawCode.toLowerCase().includes('m hng')) continue;

    // Normalize: Remove ALL spaces
    const cleanCode = rawCode.replace(/\s+/g, '');
    
    if (!cleanCode) continue;

    if (!normalizedCounts[cleanCode]) {
      normalizedCounts[cleanCode] = { count: 0, originals: new Set() };
    }
    
    normalizedCounts[cleanCode].count++;
    normalizedCounts[cleanCode].originals.add(rawCode);
  }

  console.log('\n--- Duplicate Analysis (Normalized Code) ---');
  Object.keys(normalizedCounts).forEach(code => {
    if (normalizedCounts[code].count > 1) {
      dupCount++;
      console.log(`Code: '${code}' | Count: ${normalizedCounts[code].count} | Variants: ${JSON.stringify([...normalizedCounts[code].originals])}`);
    }
  });

  if (dupCount === 0) {
    console.log('No duplicates found after normalizing spaces.');
  } else {
    console.log(`\nTotal duplicated codes found: ${dupCount}`);
  }

} catch (e) {
  console.error('Error:', e);
}
