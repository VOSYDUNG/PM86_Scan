import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SnapshotWriteRepo } from '@/domain/usecases/ports';
import { parseMisaAoaInChunks } from '@/infra/files/misaParser';
import { ImportConflict, MisaImportRow, ImportResult } from '@/domain/entities/types';
import { normKey, stripDiacritics } from '@/domain/utils/normalize';

const SOURCE_SHEET_NAME = 'DU_LIEU_NGUON_MISA';

function normalizeSheetName(name: string) {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeHeaderToken(value: string) {
  return stripDiacritics(String(value || ''))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

function tokenMatches(token: string, expected: string) {
  if (!token || !expected) return false;
  return token === expected || token.includes(expected) || expected.includes(token);
}

function hasAnyToken(tokens: string[], expectedList: string[]) {
  return tokens.some((token) => expectedList.some((expected) => tokenMatches(token, expected)));
}

function looksLikeMisaSheet(aoa: unknown[][]): boolean {
  const maxRows = Math.min(12, aoa.length);
  for (let i = 0; i < maxRows; i += 1) {
    const row = Array.isArray(aoa[i]) ? (aoa[i] as unknown[]) : [];
    if (!row.length) continue;
    const norm = row.map((cell) => normalizeHeaderToken(String(cell ?? '')));
    const hasStt = hasAnyToken(norm, ['stt']);
    const hasItemCode = hasAnyToken(norm, ['mahang']);
    const hasItemName = hasAnyToken(norm, ['tenhang']);
    const hasUom = hasAnyToken(norm, ['dvt', 'donvitinh']);
    const hasOnHand = hasAnyToken(norm, ['cuoiky', 'soluongcuoiky', 'soluongtoncuoiky']);
    if ((hasStt || i <= 8) && hasItemCode && hasItemName && hasUom && hasOnHand) {
      return true;
    }
  }
  return false;
}

// Helper to read file as base64 then parse with XLSX
async function readAndParseXlsx(uri: string): Promise<unknown[][]> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error(`File not found at URI: ${uri}`);
    }

    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const wb = XLSX.read(b64, { type: 'base64' });
    const sheetNames = wb.SheetNames || [];
    if (sheetNames.length === 0) {
      return [];
    }

    const normalizedSheetNames = sheetNames.map((name) => normalizeSheetName(name));
    if (normalizedSheetNames.includes(normalizeSheetName('NOP_VI_TRI_KIEM_KE'))) {
      throw new Error('Đây là file nộp vị trí. Vui lòng nạp tại Quản lý vị trí.');
    }
    if (
      normalizedSheetNames.includes(normalizeSheetName('THONG_TIN_GOI')) &&
      normalizedSheetNames.includes(normalizeSheetName('DANH_SACH_KIEM_KE_VI_TRI'))
    ) {
      throw new Error('Đây là gói kiểm kê vị trí. Vui lòng nạp gói tại chức năng Nạp gói vị trí.');
    }
    if (
      normalizedSheetNames.includes(normalizeSheetName('DANH_MUC_VI_TRI_SKU')) &&
      !normalizedSheetNames.includes(normalizeSheetName(SOURCE_SHEET_NAME))
    ) {
      throw new Error('Đây là file danh mục vị trí-SKU. Vui lòng nạp tại Quản lý vị trí.');
    }

    const preferred = sheetNames.find((name) => normalizeSheetName(name) === normalizeSheetName(SOURCE_SHEET_NAME));
    if (preferred) {
      const ws = wb.Sheets[preferred];
      return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
    }

    const candidates = sheetNames
      .map((name) => {
        const ws = wb.Sheets[name];
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
        return { name, aoa, match: looksLikeMisaSheet(aoa) };
      })
      .filter((s) => s.match);

    if (candidates.length === 1) {
      return candidates[0].aoa;
    }
    if (candidates.length > 1) {
      throw new Error(`File có nhiều sheet giống cấu trúc MISA (${candidates.map((c) => c.name).join(', ')}). Vui lòng giữ lại 1 sheet nguồn để khởi tạo.`);
    }

    throw new Error('Không tìm thấy sheet dữ liệu MISA hợp lệ (cần các cột: Mã hàng, Tên hàng, ĐVT/Đơn vị tính, Cuối kỳ).');
  } catch (e) {
    console.error('XLSX Read Error:', e);
    throw new Error(String(e));
  }
}

async function readAndParseCsv(uri: string): Promise<unknown[][]> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error(`File not found at URI: ${uri}`);
    }

    const csvText = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    const parsed = Papa.parse<unknown[]>(csvText, {
      skipEmptyLines: true,
      delimiter: ';',
    });
    const data = (parsed.data as unknown[][]) ?? [];
    const header = Array.isArray(data[0]) ? data[0].map((v) => normalizeHeaderToken(String(v ?? ''))) : [];
    const hasSubmissionMarker = header.includes('makydulieu') && header.includes('mavitri') && header.includes('soluongdem');
    if (hasSubmissionMarker) {
      throw new Error('Đây là file nộp vị trí. Vui lòng nạp tại Quản lý vị trí.');
    }
    const hasScopeMarker = header.includes('mavitri') && header.includes('mahang') && !header.includes('tenkho');
    if (hasScopeMarker) {
      throw new Error('Đây là file danh mục vị trí-SKU. Vui lòng nạp tại Quản lý vị trí.');
    }
    if (!looksLikeMisaSheet(data)) {
      const fallback = Papa.parse<unknown[]>(csvText, { skipEmptyLines: true });
      const fallbackData = (fallback.data as unknown[][]) ?? [];
      if (looksLikeMisaSheet(fallbackData)) return fallbackData;
      throw new Error('CSV không đúng chuẩn MISA thực tế hoặc lỗi mã hóa. Khuyến nghị dùng file .xlsx tải trực tiếp từ MISA.');
    }
    return data;
  } catch (e) {
    console.error('CSV Read Error:', e);
    throw new Error(String(e));
  }
}

export async function importSnapshotFromFile(params: {
  fileUri: string;
  sourceFileName: string;
  repo: SnapshotWriteRepo;
  onProgress: (processed: number, total: number) => void;
  resolutions?: Map<string, 'use_rowA' | 'use_rowB'>;
  codeOverrides?: Map<string, string>;
}): Promise<ImportResult> {
  const { fileUri, sourceFileName, repo, onProgress } = params;
  const ext = (sourceFileName || '').toLowerCase().split('.').pop();

  // 1. Read & Parse (Heavy Step 1 - but XLSX is native-ish, usually fast enough for 2k rows)
  // We can't easily chunk the XLSX *read* without a stream reader library which isn't available here.
  // We assume loading the AOA into memory is OK (2000 rows array is small).
  const aoa = ext === 'csv' ? await readAndParseCsv(fileUri) : await readAndParseXlsx(fileUri);
  
  const conflicts: ImportConflict[] = [];
  const map = new Map<string, MisaImportRow>();
  
  // 2. Process Chunks (To avoid blocking UI during normalization/validation)
  const generator = parseMisaAoaInChunks(aoa, 300);
  
  for await (const { rows, processed, total } of generator) {
    onProgress(processed, total);
    
    // Validate duplicates in this chunk
    for (const r of rows) {
      let currentRow = r;
      let key = `${currentRow.warehouseName}__${currentRow.itemCode}`;

      const overrideCode = params.codeOverrides?.get(key)?.trim();
      if (overrideCode) {
        const normalizedCode = overrideCode.replace(/\s+/g, '').toUpperCase();
        if (normalizedCode && normalizedCode !== currentRow.itemCode) {
          currentRow = { ...currentRow, itemCode: normalizedCode };
          key = `${currentRow.warehouseName}__${currentRow.itemCode}`;
        }
      }
      
      if (map.has(key)) {
        const rowA = map.get(key)!;
        const rowB = currentRow;
        
        const n1 = normKey(rowA.itemName);
        const n2 = normKey(rowB.itemName);

        if (n1 !== n2) {
           const resolution = params.resolutions?.get(key);
           if (resolution === 'use_rowA') {
             continue;
           } else if (resolution === 'use_rowB') {
             map.set(key, rowB);
             continue;
           } else {
             conflicts.push({
               itemCode: rowB.itemCode,
               warehouseName: rowB.warehouseName,
               rowA,
               rowB,
             });
             continue;
           }
        }
        // Duplicate but same name -> Last wins
        map.set(key, currentRow);
      } else {
        map.set(key, currentRow);
      }
    }
    
    // Yield to UI is handled by parser
  }

  if (conflicts.length > 0) {
    return { success: false, conflicts };
  }

  // 3. Insert to DB (Bulk)
  const snapshotAt = Date.now();
  const snapshotId = await repo.createSnapshot({ sourceFileName, snapshotAt });
  
  const finalRows = Array.from(map.values()).map(r => ({
    warehouseName: r.warehouseName,
    itemCode: r.itemCode,
    itemName: r.itemName,
    uom: r.uom,
    onHandQty: r.onHandQty,
    codeNorm: normKey(r.itemCode),
    nameNorm: normKey(r.itemName),
  }));
  
  // Insert in batches
  await repo.bulkUpsertSnapshot({
    snapshotId,
    rows: finalRows,
    options: { batchSize: 300 }
  });

  const warehouses = await repo.listWarehouses({ snapshotId });
  return { success: true, snapshotId, warehouses };
}
