import { ExportRepo } from '@/domain/usecases/ports';
import { CountException } from '@/domain/entities/types';
import { deriveVarianceReason } from '@/domain/utils/varianceReason';

type ExceptionCountByType = {
  'Lỗi hết hạn': number;
  'Lỗi hư hỏng': number;
  'Lỗi sai mã': number;
  'Lỗi sai quy cách': number;
  'Lỗi phẩm chất': number;
  'Lỗi khác': number;
};

const EMPTY_EXCEPTION_COUNT: ExceptionCountByType = {
  'Lỗi hết hạn': 0,
  'Lỗi hư hỏng': 0,
  'Lỗi sai mã': 0,
  'Lỗi sai quy cách': 0,
  'Lỗi phẩm chất': 0,
  'Lỗi khác': 0,
};

type SummaryRow = {
  'Kho': string;
  'Mã hàng': string;
  'Tên hàng': string;
  'ĐVT': string;
  'Tồn hệ thống': number;
  'Tổng đếm': number;
  'Đếm OK': number;
  'Lỗi hết hạn': number;
  'Lỗi hư hỏng': number;
  'Lỗi sai mã': number;
  'Lỗi sai quy cách': number;
  'Lỗi phẩm chất': number;
  'Lỗi khác': number;
  'Hàng lỗi': number;
  'Ngoài danh mục': number;
  'Chênh lệch': number;
  'Trạng thái': string;
  'Nguyên nhân vận hành (gợi ý)': string;
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
  'Lỗi hết hạn': number;
  'Lỗi hư hỏng': number;
  'Lỗi sai mã': number;
  'Lỗi sai quy cách': number;
  'Lỗi phẩm chất': number;
  'Lỗi khác': number;
  'Hàng lỗi': number;
  'Ngoài danh mục': string;
  'Nguyên nhân vận hành (gợi ý)': string;
  'Cập nhật': string;
};

function summarizeExceptions(raw: string | null | undefined): {
  badQty: number;
  counts: ExceptionCountByType;
} {
  const counts: ExceptionCountByType = { ...EMPTY_EXCEPTION_COUNT };
  if (!raw) return { badQty: 0, counts };
  try {
    const list = JSON.parse(raw) as CountException[];
    if (!Array.isArray(list) || list.length === 0) return { badQty: 0, counts };
    let badQty = 0;
    for (const ex of list) {
      const qty = Number(ex.qty) || 0;
      if (qty <= 0) continue;
      badQty += qty;
      switch (ex.reason) {
        case 'EXPIRED':
          counts['Lỗi hết hạn'] += qty;
          break;
        case 'DAMAGED':
          counts['Lỗi hư hỏng'] += qty;
          break;
        case 'WRONG_CODE':
          counts['Lỗi sai mã'] += qty;
          break;
        case 'WRONG_SIZE_PACK':
          counts['Lỗi sai quy cách'] += qty;
          break;
        case 'LOW_QUALITY':
          counts['Lỗi phẩm chất'] += qty;
          break;
        default:
          counts['Lỗi khác'] += qty;
          break;
      }
    }
    return { badQty, counts };
  } catch {
    return { badQty: 0, counts };
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

  const exceptionByItem = new Map<string, { counts: ExceptionCountByType; badQty: number }>();
  for (const row of detailRows) {
    const itemCode = row.itemCode || row.itemKey;
    const parsed = summarizeExceptions(row.exceptions);
    const current = exceptionByItem.get(itemCode) || { counts: { ...EMPTY_EXCEPTION_COUNT }, badQty: 0 };
    current.badQty += parsed.badQty;
    current.counts['Lỗi hết hạn'] += parsed.counts['Lỗi hết hạn'];
    current.counts['Lỗi hư hỏng'] += parsed.counts['Lỗi hư hỏng'];
    current.counts['Lỗi sai mã'] += parsed.counts['Lỗi sai mã'];
    current.counts['Lỗi sai quy cách'] += parsed.counts['Lỗi sai quy cách'];
    current.counts['Lỗi phẩm chất'] += parsed.counts['Lỗi phẩm chất'];
    current.counts['Lỗi khác'] += parsed.counts['Lỗi khác'];
    exceptionByItem.set(itemCode, current);
  }

  const summary: SummaryRow[] = summaryRows.map((r) => {
    const totalCount = r.totalCount ?? 0;
    const totalUsable = r.totalUsable ?? 0;
    const exceptionAgg = exceptionByItem.get(r.itemCode) || { counts: { ...EMPTY_EXCEPTION_COUNT }, badQty: 0 };
    const badQty = exceptionAgg.badQty;
    const diff = totalUsable - r.onHandQty;
    const status = r.totalUsable === null ? 'Chưa kiểm' : diff === 0 ? 'Khớp' : 'Lệch';
    return {
      'Kho': r.warehouseName,
      'Mã hàng': r.itemCode,
      'Tên hàng': r.itemName,
      'ĐVT': r.uom,
      'Tồn hệ thống': r.onHandQty,
      'Tổng đếm': totalCount,
      'Đếm OK': totalUsable,
      'Lỗi hết hạn': exceptionAgg.counts['Lỗi hết hạn'],
      'Lỗi hư hỏng': exceptionAgg.counts['Lỗi hư hỏng'],
      'Lỗi sai mã': exceptionAgg.counts['Lỗi sai mã'],
      'Lỗi sai quy cách': exceptionAgg.counts['Lỗi sai quy cách'],
      'Lỗi phẩm chất': exceptionAgg.counts['Lỗi phẩm chất'],
      'Lỗi khác': exceptionAgg.counts['Lỗi khác'],
      'Hàng lỗi': badQty,
      'Ngoài danh mục': r.outOfScopeCount ?? 0,
      'Chênh lệch': diff,
      'Trạng thái': status,
      'Nguyên nhân vận hành (gợi ý)': deriveVarianceReason(diff, r.outOfScopeCount ?? 0),
    };
  });

  const detail: DetailRow[] = detailRows.map((r) => {
    const ex = summarizeExceptions(r.exceptions);
    const diff = (r.countUsable ?? 0) - (r.onHandQty ?? 0);
    const outOfScopeFlag = r.isOutOfScope ? 1 : 0;
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
      'Lỗi hết hạn': ex.counts['Lỗi hết hạn'],
      'Lỗi hư hỏng': ex.counts['Lỗi hư hỏng'],
      'Lỗi sai mã': ex.counts['Lỗi sai mã'],
      'Lỗi sai quy cách': ex.counts['Lỗi sai quy cách'],
      'Lỗi phẩm chất': ex.counts['Lỗi phẩm chất'],
      'Lỗi khác': ex.counts['Lỗi khác'],
      'Hàng lỗi': ex.badQty,
      'Ngoài danh mục': r.isOutOfScope ? 'Có' : 'Không',
      'Nguyên nhân vận hành (gợi ý)': deriveVarianceReason(diff, outOfScopeFlag),
      'Cập nhật': r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '',
    };
  });

  return { summary, detail };
}
