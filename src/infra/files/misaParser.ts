import { MisaImportRow } from '@/domain/entities/types';
import { stripDiacritics } from '@/domain/utils/normalize';

function normHeader(input: unknown): string {
  return stripDiacritics(String(input ?? ''))
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/[?]/g, '');
}

function headerLike(token: string, expected: string): boolean {
  if (!token || !expected) return false;
  return token === expected || token.includes(expected) || expected.includes(token);
}

function findHeaderIndex(rowNorm: string[], expectedTokens: string[]): number {
  return rowNorm.findIndex((token) => expectedTokens.some((expected) => headerLike(token, expected)));
}

type HeaderLayout = {
  itemCode: number;
  itemName: number;
  uom: number;
  onHand: number;
  headerRow: number;
  dataStart: number;
  warehouseName: string;
};

function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  const clean = s.replace(/\s/g, '');
  if (clean.includes('.') && clean.includes(',')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      return Number(clean.replace(/\./g, '').replace(',', '.'));
    }
    return Number(clean.replace(/,/g, ''));
  }
  const parsed = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractWarehouseName(aoa: unknown[][], headerRow: number): string {
  for (let i = 0; i < headerRow; i += 1) {
    const raw = (aoa[i] ?? [])
      .map((cell) => String(cell ?? '').trim())
      .filter(Boolean)
      .join(' ');
    if (!raw) continue;
    const normalized = stripDiacritics(raw).toLowerCase();
    if (!normalized.includes('kho')) continue;

    const byColon = raw.match(/Kho\s*:\s*(.+?)(?:,\s*Từ ngày|,\s*Tu ngay|$)/i);
    if (byColon?.[1]) return byColon[1].trim();

    const normByColon = normalized.match(/kho\s*:\s*(.+?)(?:,\s*tu\s*ngay|$)/i);
    if (normByColon?.[1]) return normByColon[1].trim();
  }
  return 'Kho mặc định';
}

function resolveMisaLayout(aoa: unknown[][]): HeaderLayout {
  for (let i = 0; i < aoa.length; i += 1) {
    const row = aoa[i] ?? [];
    if (!Array.isArray(row) || row.length === 0) continue;
    const rowNorm = row.map((c) => normHeader(c));

    const hasStt = findHeaderIndex(rowNorm, ['stt']) >= 0;
    const itemCode = findHeaderIndex(rowNorm, ['mahang']);
    const itemName = findHeaderIndex(rowNorm, ['tenhang']);
    const uom = findHeaderIndex(rowNorm, ['dvt', 'donvitinh']);
    const onHand = findHeaderIndex(rowNorm, ['cuoiky', 'soluongcuoiky', 'soluongtoncuoiky']);

    if ((hasStt || i <= 8) && itemCode >= 0 && itemName >= 0 && uom >= 0 && onHand >= 0) {
      const next = (aoa[i + 1] ?? []).map((c) => normHeader(c));
      const hasSubHeader = headerLike(next[onHand] || '', 'soluong');
      return {
        itemCode,
        itemName,
        uom,
        onHand,
        headerRow: i,
        dataStart: hasSubHeader ? i + 2 : i + 1,
        warehouseName: extractWarehouseName(aoa, i),
      };
    }
  }

  throw new Error(
    'Sai cấu trúc MISA thực tế. Cần header gồm: STT, Mã hàng, Tên hàng, ĐVT, Cuối kỳ.',
  );
}

function isAggregateCode(itemCode: string): boolean {
  const code = normHeader(itemCode);
  return code.includes('tongcong') || code.includes('cong') || code.includes('subtotal');
}

function buildRow(layout: HeaderLayout, row: unknown[]): MisaImportRow | null {
  const rawItemCode = String(row[layout.itemCode] ?? '').trim();
  const itemName = String(row[layout.itemName] ?? '').trim();
  if (!rawItemCode && !itemName) return null;
  if (!rawItemCode) return null;
  if (isAggregateCode(rawItemCode)) return null;

  const itemCode = rawItemCode.replace(/\s+/g, '').toUpperCase();
  const uom = String(row[layout.uom] ?? '').trim();
  const onHandQty = toNumber(row[layout.onHand]);

  return {
    warehouseName: layout.warehouseName,
    itemCode,
    itemName,
    uom,
    onHandQty,
  };
}

export function parseMisaAoa(aoa: unknown[][]): MisaImportRow[] {
  if (!Array.isArray(aoa) || aoa.length === 0) return [];
  const layout = resolveMisaLayout(aoa);
  const out: MisaImportRow[] = [];
  for (let i = layout.dataStart; i < aoa.length; i += 1) {
    const row = aoa[i] ?? [];
    const parsed = buildRow(layout, row);
    if (!parsed) continue;
    out.push(parsed);
  }
  return out;
}

export async function* parseMisaAoaInChunks(aoa: unknown[][], chunkSize = 300) {
  if (!Array.isArray(aoa) || aoa.length === 0) return;
  const layout = resolveMisaLayout(aoa);
  const total = Math.max(0, aoa.length - layout.dataStart);
  let processed = 0;
  let buffer: MisaImportRow[] = [];

  for (let i = layout.dataStart; i < aoa.length; i += 1) {
    const row = aoa[i] ?? [];
    const parsed = buildRow(layout, row);
    if (!parsed) continue;

    buffer.push(parsed);
    processed += 1;
    if (buffer.length >= chunkSize) {
      yield { rows: buffer, processed, total };
      buffer = [];
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  if (buffer.length > 0) {
    yield { rows: buffer, processed, total };
  }
}
