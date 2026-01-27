import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';

import { buildStockCountExportTables } from '@/domain/usecases/buildStockCountExportTables';
import { ExportRepo } from '@/domain/usecases/ports';

/**
 * Export CSV for MISA re-import.
 * - Uses UTF-8 BOM so Excel on Windows opens Vietnamese/Lao correctly.
 */
export async function exportMisaCsv(params: {
  repo: ExportRepo;
  sessionId: string;
  snapshotId: string;
  warehouseName: string;
}): Promise<{ uri: string; fileName: string }> {
  const tables = await buildStockCountExportTables({
    repo: params.repo,
    sessionId: params.sessionId,
    snapshotId: params.snapshotId,
    warehouseName: params.warehouseName,
  });
  const table = tables.summary;

  // Ensure nulls become empty cells (instead of "null")
  const safeTable = table.map((r) => {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(r)) {
      out[k] = v === null || v === undefined ? '' : (v as any);
    }
    return out;
  });

  const csvBody = Papa.unparse(safeTable, {
    quotes: true,
    newline: '\r\n',
    delimiter: ',',
  });

  // UTF-8 BOM
  const csv = `\ufeff${csvBody}`;

  const fileName = `kiemke_${params.warehouseName.replace(/\s+/g, '_')}_${Date.now()}.csv`;
  const uri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Xuất file kiểm kê (CSV)',
      UTI: 'public.comma-separated-values-text',
    });
  }

  return { uri, fileName };
}
