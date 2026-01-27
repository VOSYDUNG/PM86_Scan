import { ExportRepo } from '@/domain/usecases/ports';
import { CountException } from '@/domain/entities/types';

type SummaryRow = {
  'Kho': string;
  'Mã hàng': string;
  'Tên hàng': string;
  'ĐVT': string;
  'Tồn hệ thống': number;
  'Tổng đếm': number;
  'Hàng lỗi': number;
  'Đếm OK': number;
  'Chênh lệch': number;
  'Trạng thái': string;
};

type DetailRow = {
  'Kho': string;
  'Vị trí': string;
  'Loại vị trí': string;
  'Mã hàng': string;
  'Tên hàng': string;
  'ĐVT': string;
  'Tồn hệ thống': number;
  'Tổng đếm': number;
  'Đếm OK': number;
  'Hàng lỗi': number;
  'Ngoại lệ': string;
  'Cập nhật': string;
};

function summarizeExceptions(raw: string | null | undefined) {
  if (!raw) return { badQty: 0, note: '' };
  try {
    const list = JSON.parse(raw) as CountException[];
    if (!Array.isArray(list) || list.length === 0) return { badQty: 0, note: '' };
    const parts: string[] = [];
    let badQty = 0;
    for (const ex of list) {
      const qty = Number(ex.qty) || 0;
      badQty += qty;
      if (qty > 0) parts.push(`${ex.reason}:${qty}`);
    }
    return { badQty, note: parts.join('; ') };
  } catch {
    return { badQty: 0, note: '' };
  }
}

export async function buildStockCountExportTables(params: {
  repo: ExportRepo;
  sessionId: string;
  snapshotId: string;
  warehouseName: string;
}): Promise<{ summary: SummaryRow[]; detail: DetailRow[] }> {
  const [summaryRows, detailRows] = await Promise.all([
    params.repo.getExportSummaryRows({
      sessionId: params.sessionId,
      snapshotId: params.snapshotId,
      warehouseName: params.warehouseName,
    }),
    params.repo.getExportDetailRows({
      sessionId: params.sessionId,
      snapshotId: params.snapshotId,
      warehouseName: params.warehouseName,
    }),
  ]);

  const summary: SummaryRow[] = summaryRows.map((r) => {
    const totalCount = r.totalCount ?? 0;
    const totalUsable = r.totalUsable ?? 0;
    const badQty = Math.max(totalCount - totalUsable, 0);
    const diff = totalUsable - r.onHandQty;
    const status = r.totalUsable === null ? 'Chưa kiểm' : diff === 0 ? 'Khớp' : 'Lệch';
    return {
      'Kho': r.warehouseName,
      'Mã hàng': r.itemCode,
      'Tên hàng': r.itemName,
      'ĐVT': r.uom,
      'Tồn hệ thống': r.onHandQty,
      'Tổng đếm': totalCount,
      'Hàng lỗi': badQty,
      'Đếm OK': totalUsable,
      'Chênh lệch': diff,
      'Trạng thái': status,
    };
  });

  const detail: DetailRow[] = detailRows.map((r) => {
    const ex = summarizeExceptions(r.exceptions);
    return {
      'Kho': r.warehouseName,
      'Vị trí': r.locationName || r.locationCode || '-',
      'Loại vị trí': r.locationType || 'OTHER',
      'Mã hàng': r.itemCode || r.itemKey,
      'Tên hàng': r.itemName || '',
      'ĐVT': r.uom || '',
      'Tồn hệ thống': r.onHandQty ?? 0,
      'Tổng đếm': r.countTotal ?? 0,
      'Đếm OK': r.countUsable ?? 0,
      'Hàng lỗi': ex.badQty,
      'Ngoại lệ': ex.note,
      'Cập nhật': r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '',
    };
  });

  return { summary, detail };
}
