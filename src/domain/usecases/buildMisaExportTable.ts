import { ExportRepo } from '@/domain/usecases/ports';

export type MisaExportRow = {
  'Tên kho': string;
  'Mã hàng': string;
  'Tên hàng': string;
  'ĐVT': string;
  'Cuối kỳ (Số lượng)': number;
  'SL Kiểm kê': number | null;
  'Chênh lệch': number | null;
  'Ghi chú': string | null;
};

export async function buildMisaExportTable(params: {
  repo: ExportRepo;
  sessionId: string;
  snapshotId: string;
  warehouseName: string;
}): Promise<MisaExportRow[]> {
  const rows = await params.repo.getExportRows({
    sessionId: params.sessionId,
    snapshotId: params.snapshotId,
    warehouseName: params.warehouseName,
  });

  return rows.map((r) => ({
    'Tên kho': r.warehouseName,
    'Mã hàng': r.itemCode,
    'Tên hàng': r.itemName,
    'ĐVT': r.uom,
    'Cuối kỳ (Số lượng)': r.onHandQty,
    'SL Kiểm kê': r.actualQty,
    'Chênh lệch': r.diffQty,
    'Ghi chú': r.note,
  }));
}
