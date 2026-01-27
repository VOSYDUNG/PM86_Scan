import { MisaImportRow } from '@/domain/entities/types';
import { stripDiacritics } from '@/domain/utils/normalize';

function normHeader(s: unknown): string {
  const t = String(s ?? '').trim();
  return stripDiacritics(t)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/[?]/g, ''); // Remove question marks common in bad encoding
}

function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  
  const clean = s.replace(/\s/g, '');
  
  // Check format 1.000,00
  if (clean.includes('.') && clean.includes(',')) {
     if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
        // 1.000,00 -> remove dot, comma to dot
        return Number(clean.replace(/\./g, '').replace(',', '.'));
     } else {
        // 1,000.00 -> remove comma
        return Number(clean.replace(/,/g, ''));
     }
  }
  
  const parsed = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseMisaAoa(aoa: unknown[][]): MisaImportRow[] {
  if (!Array.isArray(aoa) || aoa.length === 0) return [];

  let globalWarehouseName = '';
  let headerRowIndex = -1;
  let dataStart = 0;
  let colMap: {
    warehouse?: number;
    itemCode?: number;
    itemName?: number;
    uom?: number;
    onHand?: number;
  } = {};

  // 1. Scan first 15 rows for "Kho:" and Header
  for (let i = 0; i < Math.min(15, aoa.length); i++) {
    const row = aoa[i] ?? [];
    const rowStr = row.join(' ');
    
    // Detect Global Warehouse Name
    if (!globalWarehouseName && (rowStr.includes('Kho:') || rowStr.includes('Kho :'))) {
       const match = rowStr.match(/Kho\s*[:]\s*([^,]+)/i);
       if (match && match[1]) {
          globalWarehouseName = match[1].trim();
       }
    }

    const rowNorm = row.map(c => normHeader(c));
    
    // Detect Header Columns
    const idxItemCode = rowNorm.findIndex(c => c.includes('mahang') || c === 'ma');
    const idxItemName = rowNorm.findIndex(c => c.includes('tenhang') || c === 'ten');
    const idxUom = rowNorm.findIndex(c => c === 'dvt' || c.includes('donvi'));
    const idxOnHand = rowNorm.findIndex(c => c.includes('cuoiky') || c.includes('tonkho') || c === 'sl');
    
    // Optional Warehouse Column
    const idxWarehouse = rowNorm.findIndex(c => c.includes('tenkho') || c === 'kho');

    if (idxItemCode >= 0 && idxItemName >= 0) {
       headerRowIndex = i;
       colMap = {
         warehouse: idxWarehouse,
         itemCode: idxItemCode,
         itemName: idxItemName,
         uom: idxUom,
         onHand: idxOnHand
       };
       
       // Check next row for sub-headers
       const nextRow = aoa[i + 1] ?? [];
       const nextRowNorm = nextRow.map(c => normHeader(c));
       const isSubHeader = nextRowNorm.some(c => c.includes('soluong') || c.includes('thucte'));
       
       dataStart = isSubHeader ? i + 2 : i + 1;
       break;
    }
  }

  // Fallback if global warehouse name is still empty
  if (!globalWarehouseName) {
     globalWarehouseName = 'Kho mặc định';
  }

  if (headerRowIndex < 0) return [];

  const out: MisaImportRow[] = [];
  
  for (let i = dataStart; i < aoa.length; i++) {
    const row = aoa[i] ?? [];
    
    // Determine Warehouse Name
    let warehouseName = globalWarehouseName;
    if (colMap.warehouse !== undefined && colMap.warehouse >= 0) {
       const val = String(row[colMap.warehouse] ?? '').trim();
       if (val) warehouseName = val;
    }

    const rawItemCode = String(row[colMap.itemCode!] ?? '').trim();
    if (!rawItemCode) continue;

    // Skip aggregation rows
    const checkCode = normHeader(rawItemCode);
    if (checkCode.includes('tongcong') || checkCode.includes('cong')) continue;

    // STRICT CLEANING
    const itemCode = rawItemCode.replace(/\s+/g, '').toUpperCase();
    
    const itemName = String(row[colMap.itemName!] ?? '').trim();
    const uom = colMap.uom !== undefined ? String(row[colMap.uom] ?? '').trim() : '';
    
    const onHandQty = colMap.onHand !== undefined ? toNumber(row[colMap.onHand]) : 0;

    out.push({ warehouseName, itemCode, itemName, uom, onHandQty });
  }

  return out;
}

export async function* parseMisaAoaInChunks(aoa: unknown[][], chunkSize = 300) {
  if (!Array.isArray(aoa) || aoa.length === 0) return;

  let globalWarehouseName = '';
  let headerRowIndex = -1;
  let dataStart = 0;
  let colMap: {
    warehouse?: number;
    itemCode?: number;
    itemName?: number;
    uom?: number;
    onHand?: number;
  } = {};

  // 1. Scan first 15 rows for "Kho:" and Header
  for (let i = 0; i < Math.min(15, aoa.length); i++) {
    const row = aoa[i] ?? [];
    const rowStr = row.join(' ');
    
    if (!globalWarehouseName && (rowStr.includes('Kho:') || rowStr.includes('Kho :'))) {
       const match = rowStr.match(/Kho\s*[:]\s*([^,]+)/i);
       if (match && match[1]) {
          globalWarehouseName = match[1].trim();
       }
    }

    const rowNorm = row.map(c => normHeader(c));
    
    const idxItemCode = rowNorm.findIndex(c => c.includes('mahang') || c === 'ma');
    const idxItemName = rowNorm.findIndex(c => c.includes('tenhang') || c === 'ten');
    const idxUom = rowNorm.findIndex(c => c === 'dvt' || c.includes('donvi'));
    const idxOnHand = rowNorm.findIndex(c => c.includes('cuoiky') || c.includes('tonkho') || c === 'sl');
    const idxWarehouse = rowNorm.findIndex(c => c.includes('tenkho') || c === 'kho');

    if (idxItemCode >= 0 && idxItemName >= 0) {
       headerRowIndex = i;
       colMap = {
         warehouse: idxWarehouse,
         itemCode: idxItemCode,
         itemName: idxItemName,
         uom: idxUom,
         onHand: idxOnHand
       };
       
       const nextRow = aoa[i + 1] ?? [];
       const nextRowNorm = nextRow.map(c => normHeader(c));
       const isSubHeader = nextRowNorm.some(c => c.includes('soluong') || c.includes('thucte'));
       
       dataStart = isSubHeader ? i + 2 : i + 1;
       break;
    }
  }

  if (!globalWarehouseName) {
     globalWarehouseName = 'Kho mặc định';
  }

  if (headerRowIndex < 0) return;

  const total = aoa.length - dataStart;
  let processed = 0;
  let buffer: MisaImportRow[] = [];

  for (let i = dataStart; i < aoa.length; i++) {
    const row = aoa[i] ?? [];
    
    let warehouseName = globalWarehouseName;
    if (colMap.warehouse !== undefined && colMap.warehouse >= 0) {
       const val = String(row[colMap.warehouse] ?? '').trim();
       if (val) warehouseName = val;
    }

    const rawItemCode = String(row[colMap.itemCode!] ?? '').trim();
    if (!rawItemCode) continue;

    const checkCode = normHeader(rawItemCode);
    if (checkCode.includes('tongcong') || checkCode.includes('cong')) continue;

    const itemCode = rawItemCode.replace(/\s+/g, '').toUpperCase();
    const itemName = String(row[colMap.itemName!] ?? '').trim();
    const uom = colMap.uom !== undefined ? String(row[colMap.uom] ?? '').trim() : '';
    const onHandQty = colMap.onHand !== undefined ? toNumber(row[colMap.onHand]) : 0;

    buffer.push({ warehouseName, itemCode, itemName, uom, onHandQty });
    processed++;

    if (buffer.length >= chunkSize) {
      yield { rows: buffer, processed, total };
      buffer = [];
      await new Promise(r => setTimeout(r, 0)); // Yield to event loop
    }
  }

  if (buffer.length > 0) {
    yield { rows: buffer, processed, total };
  }
}