import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { CountSessionRepo, ExportRepo, SnapshotWriteRepo } from '@/domain/usecases/ports';
import { LocationExchangeMeta } from '@/domain/entities/types';
import { normKey, stripDiacritics } from '@/domain/utils/normalize';

function toToken(value: string): string {
  return stripDiacritics(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 14) || 'KHO';
}

function toDateCode(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export function buildDataCycleCode(params: { warehouseName: string; basedAt: number }): string {
  const wh = toToken(params.warehouseName);
  return `${wh}-${toDateCode(params.basedAt)}-K1`;
}

async function writeAndShareWorkbook(params: { workbook: XLSX.WorkBook; fileName: string; dialogTitle: string }) {
  const base64 = XLSX.write(params.workbook, { type: 'base64', bookType: 'xlsx' });
  const uri = `${FileSystem.documentDirectory}${params.fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: 'base64' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: params.dialogTitle,
      UTI: 'com.microsoft.excel.xlsx',
    });
  }
  return { uri, fileName: params.fileName };
}

export async function exportLocationPackage(params: {
  sessionRepo: CountSessionRepo;
  sessionId: string;
  locationId: string;
  dataCycleCode?: string;
}) {
  const sessionMeta = await params.sessionRepo.getSessionMeta(params.sessionId);
  if (!sessionMeta) throw new Error('Không tìm thấy phiên kiểm kê.');
  const dataCycleCode = params.dataCycleCode || buildDataCycleCode({ warehouseName: sessionMeta.warehouseName, basedAt: sessionMeta.createdAt });

  const pkg = await params.sessionRepo.buildLocationPackage({
    sessionId: params.sessionId,
    locationId: params.locationId,
    dataCycleCode,
  });

  await params.sessionRepo.setSessionExchangeMeta({
    sessionId: params.sessionId,
    dataCycleCode: pkg.meta.dataCycleCode,
    sourceSnapshotId: pkg.meta.snapshotId,
    sourceFileName: pkg.meta.sourceFileName,
    snapshotDate: pkg.meta.snapshotDate,
    warehouseName: pkg.meta.warehouseName,
  });

  const infoRows = [
    {
      'Mã kỳ dữ liệu': pkg.meta.dataCycleCode,
      'Mã snapshot nguồn': pkg.meta.snapshotId,
      'Tên file nguồn': pkg.meta.sourceFileName,
      'Tên kho': pkg.meta.warehouseName,
      'Mã vị trí': pkg.meta.locationCode,
      'Tên vị trí': pkg.meta.locationName,
      'Ngày chốt dữ liệu': pkg.meta.snapshotDate,
    },
  ];
  const itemRows = pkg.items.map((item) => ({
    'Mã hàng': item.itemCode,
    'Tên hàng': item.itemName,
    'ĐVT': item.uom,
    'SL tồn cuối kỳ': item.onHandQty,
  }));
  const guideRows = [
    { 'Hướng dẫn': '1) Kho nhỏ dùng file này để nạp gói vị trí và kiểm đếm.' },
    { 'Hướng dẫn': '2) Không sửa Mã kỳ dữ liệu / Mã snapshot nguồn / Tên kho.' },
    { 'Hướng dẫn': '3) Kiểm xong xuất file nộp vị trí gửi về kho tổng để nạp ngược.' },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(infoRows), 'THONG_TIN_GOI');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), 'DANH_SACH_KIEM_KE_VI_TRI');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guideRows), 'HUONG_DAN');

  const safeCode = toToken(pkg.meta.locationCode);
  const fileName = `GOI_KIEM_KE_${pkg.meta.dataCycleCode}_${safeCode}.xlsx`;
  return writeAndShareWorkbook({
    workbook: wb,
    fileName,
    dialogTitle: 'Xuất gói kiểm kê vị trí',
  });
}

export async function importLocationPackage(params: {
  snapshotRepo: SnapshotWriteRepo;
  sessionRepo: CountSessionRepo;
  fileName: string;
  meta: LocationExchangeMeta;
  items: Array<{ itemCode: string; itemName: string; uom: string; onHandQty: number }>;
}) {
  const dedupe = new Map<string, { itemCode: string; itemName: string; uom: string; onHandQty: number }>();
  for (const item of params.items) {
    const code = (item.itemCode || '').trim();
    if (!code) continue;
    const key = normKey(code);
    if (dedupe.has(key)) {
      throw new Error(`File gói có mã hàng trùng: ${code}`);
    }
    dedupe.set(key, {
      itemCode: code,
      itemName: item.itemName || code,
      uom: item.uom || 'EA',
      onHandQty: Number.isFinite(item.onHandQty) ? item.onHandQty : 0,
    });
  }
  const rows = Array.from(dedupe.values());
  if (!rows.length) {
    throw new Error('File gói không có dữ liệu hàng hợp lệ.');
  }

  const snapshotId = await params.snapshotRepo.createSnapshot({
    sourceFileName: params.fileName,
    snapshotAt: Date.now(),
  });

  await params.snapshotRepo.bulkUpsertSnapshot({
    snapshotId,
    rows: rows.map((r) => ({
      warehouseName: params.meta.warehouseName,
      itemCode: r.itemCode,
      itemName: r.itemName,
      uom: r.uom,
      onHandQty: r.onHandQty,
      codeNorm: normKey(r.itemCode),
      nameNorm: normKey(r.itemName),
    })),
    options: { batchSize: 300 },
  });

  const sessionId = await params.sessionRepo.createSession({
    snapshotId,
    warehouseName: params.meta.warehouseName,
  });

  const locationId = await params.sessionRepo.ensureLocationInSession({
    sessionId,
    locationCode: params.meta.locationCode,
    locationName: params.meta.locationName,
    locationType: 'OTHER',
  });
  await params.sessionRepo.replaceLocationScope({
    sessionId,
    locationId,
    itemKeys: rows.map((r) => r.itemCode),
    source: 'mapping_import',
  });

  await params.sessionRepo.setSessionExchangeMeta({
    sessionId,
    dataCycleCode: params.meta.dataCycleCode,
    sourceSnapshotId: params.meta.snapshotId,
    sourceFileName: params.meta.sourceFileName,
    snapshotDate: params.meta.snapshotDate,
    warehouseName: params.meta.warehouseName,
  });

  return {
    snapshotId,
    sessionId,
    locationId,
    locationCode: params.meta.locationCode,
    warehouseName: params.meta.warehouseName,
  };
}

export async function exportLocationSubmission(params: {
  exportRepo: ExportRepo;
  sessionRepo: CountSessionRepo;
  sessionId: string;
  snapshotId: string;
  warehouseName: string;
  locationId: string;
}) {
  const location = await params.sessionRepo.getLocationMeta({ sessionId: params.sessionId, locationId: params.locationId });
  if (!location) throw new Error('Không tìm thấy vị trí để xuất file nộp.');

  const exchangeMeta = await params.sessionRepo.getSessionExchangeMeta(params.sessionId);
  const cycleCode = exchangeMeta?.dataCycleCode || buildDataCycleCode({ warehouseName: params.warehouseName, basedAt: Date.now() });
  const snapshotSourceId = exchangeMeta?.sourceSnapshotId || params.snapshotId;
  const sourceFileName = exchangeMeta?.sourceFileName || 'DU_LIEU_NGUON_MISA';
  const snapshotDate = exchangeMeta?.snapshotDate || new Date().toISOString().slice(0, 10);

  const detailRows = await params.exportRepo.getExportDetailRows({
    sessionId: params.sessionId,
    snapshotId: params.snapshotId,
    warehouseName: params.warehouseName,
  });
  const rowsByLocation = detailRows.filter((r) => (r.locationCode || '') === location.locationCode);
  if (!rowsByLocation.length) {
    throw new Error('Vị trí chưa có dữ liệu kiểm đếm để xuất file nộp.');
  }

  const rows = rowsByLocation.map((r) => ({
    'Mã kỳ dữ liệu': cycleCode,
    'Mã snapshot nguồn': snapshotSourceId,
    'Tên file nguồn': sourceFileName,
    'Tên kho': params.warehouseName,
    'Mã vị trí': location.locationCode,
    'Tên vị trí': location.locationName,
    'Ngày chốt dữ liệu': snapshotDate,
    'Mã hàng': r.itemCode || r.itemKey,
    'Số lượng đếm': r.countTotal ?? 0,
    'Số lượng đạt': r.countUsable ?? 0,
    'Ngoài danh mục': r.isOutOfScope ? 1 : 0,
    'Thời điểm cập nhật': r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'NOP_VI_TRI_KIEM_KE');
  const safeCode = toToken(location.locationCode);
  const fileName = `NOP_VI_TRI_${cycleCode}_${safeCode}.xlsx`;
  return writeAndShareWorkbook({
    workbook: wb,
    fileName,
    dialogTitle: 'Xuất file nộp vị trí',
  });
}

export async function importLocationSubmission(params: {
  sessionRepo: CountSessionRepo;
  sessionId: string;
  snapshotId: string;
  warehouseName: string;
  meta: LocationExchangeMeta;
  rows: Array<{ itemCode: string; countTotal: number; countUsable: number; outOfScope: boolean; updatedAt: number }>;
}) {
  return params.sessionRepo.importLocationSubmission({
    sessionId: params.sessionId,
    expectedSnapshotId: params.snapshotId,
    expectedWarehouseName: params.warehouseName,
    meta: params.meta,
    rows: params.rows,
  });
}
