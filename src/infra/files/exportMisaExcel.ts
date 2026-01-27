import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';

import { ExportRepo } from '@/domain/usecases/ports';
import { buildStockCountExportTables } from '@/domain/usecases/buildStockCountExportTables';

export async function exportMisaExcel(params: {
  repo: ExportRepo;
  sessionId: string;
  snapshotId: string;
  warehouseName: string;
}) {
  try {
    // 1. Get Data
    const tables = await buildStockCountExportTables(params);

    if (tables.summary.length === 0 && tables.detail.length === 0) {
      throw new Error('Không có dữ liệu để xuất');
    }

    // 2. Prepare Worksheets
    const wsSummary = XLSX.utils.json_to_sheet(tables.summary);
    const wsDetail = XLSX.utils.json_to_sheet(tables.detail);

    // Auto-width (summary)
    const headersSummary = tables.summary.length > 0 ? Object.keys(tables.summary[0]) : [];
    const colWidthsSummary = headersSummary.map(key => {
      let maxLen = key.length;
      tables.summary.forEach(row => {
        const val = String((row as any)[key] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(maxLen + 2, 50) };
    });
    wsSummary['!cols'] = colWidthsSummary;

    // Auto-width (detail)
    const headersDetail = tables.detail.length > 0 ? Object.keys(tables.detail[0]) : [];
    const colWidthsDetail = headersDetail.map(key => {
      let maxLen = key.length;
      tables.detail.forEach(row => {
        const val = String((row as any)[key] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(maxLen + 2, 50) };
    });
    wsDetail['!cols'] = colWidthsDetail;

    // 3. Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'TongHop');
    XLSX.utils.book_append_sheet(wb, wsDetail, 'ChiTiet');

    // 4. Write to Base64
    // Note: React Native / Expo requires type 'base64' to write as file
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    if (!base64 || typeof base64 !== 'string') {
       throw new Error('Lỗi tạo file Excel (Output rỗng).');
    }

    // 5. Save and Share
    const filename = `KiemKe_${params.warehouseName.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: 'base64',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Xuất file kiểm kê (.xlsx)',
        UTI: 'com.microsoft.excel.xlsx'
      });
    } else {
      throw new Error('Thiết bị không hỗ trợ chia sẻ file.');
    }
  } catch (e) {
    console.error('Export Excel Error:', e);
    throw e; // Re-throw to let UI handle alert
  }
}
