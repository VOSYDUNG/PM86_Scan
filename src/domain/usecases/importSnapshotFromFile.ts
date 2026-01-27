import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { SnapshotWriteRepo } from '@/domain/usecases/ports';
import { parseMisaAoaInChunks } from '@/infra/files/misaParser';
import { ImportConflict, MisaImportRow, ImportResult } from '@/domain/entities/types';
import { normKey } from '@/domain/utils/normalize';

// Helper to read file as base64 then parse with XLSX
async function readAndParseXlsx(uri: string): Promise<unknown[][]> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error(`File not found at URI: ${uri}`);
    }

    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const wb = XLSX.read(b64, { type: 'base64' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    return XLSX.utils.sheet_to_json(ws, { header: 1 });
  } catch (e) {
    console.error('XLSX Read Error:', e);
    throw new Error(`Failed to read Excel file: ${String(e)}`);
  }
}

export async function importSnapshotFromFile(params: {
  fileUri: string;
  sourceFileName: string;
  repo: SnapshotWriteRepo;
  onProgress: (processed: number, total: number) => void;
  resolutions?: Map<string, 'use_rowA' | 'use_rowB'>;
}): Promise<ImportResult> {
  const { fileUri, sourceFileName, repo, onProgress } = params;

  // 1. Read & Parse (Heavy Step 1 - but XLSX is native-ish, usually fast enough for 2k rows)
  // We can't easily chunk the XLSX *read* without a stream reader library which isn't available here.
  // We assume loading the AOA into memory is OK (2000 rows array is small).
  const aoa = await readAndParseXlsx(fileUri);
  
  const conflicts: ImportConflict[] = [];
  const validRows: MisaImportRow[] = [];
  const map = new Map<string, MisaImportRow>();
  
  // 2. Process Chunks (To avoid blocking UI during normalization/validation)
  const generator = parseMisaAoaInChunks(aoa, 300);
  
  for await (const { rows, processed, total } of generator) {
    onProgress(processed, total);
    
    // Validate duplicates in this chunk
    for (const r of rows) {
      const key = `${r.warehouseName}__${r.itemCode}`;
      
      if (map.has(key)) {
        const rowA = map.get(key)!;
        const rowB = r;
        
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
               itemCode: r.itemCode,
               warehouseName: r.warehouseName,
               rowA,
               rowB,
             });
             continue;
           }
        }
        // Duplicate but same name -> Last wins
        map.set(key, r);
      } else {
        map.set(key, r);
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
