import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { LocationExchangeMeta, LocationSubmissionRow } from '@/domain/entities/types';

const SUBMISSION_SHEET_NAME = 'NOP_VI_TRI_KIEM_KE';

const HEADER_KEYS = {
  dataCycleCode: 'makydulieu',
  snapshotId: 'masnapshotnguon',
  sourceFileName: 'tenfilenguon',
  warehouseName: 'tenkho',
  locationCode: 'mavitri',
  locationName: 'tenvitri',
  snapshotDate: 'ngaychotdulieu',
  itemCode: 'mahang',
  countTotal: 'soluongdem',
  countUsable: 'soluongdat',
  outOfScope: 'ngoaidanhmuc',
  updatedAt: 'thoidiemcapnhat',
} as const;

const REQUIRED_HEADERS = [
  'Mã kỳ dữ liệu',
  'Mã snapshot nguồn',
  'Tên file nguồn',
  'Tên kho',
  'Mã vị trí',
  'Mã hàng',
  'Số lượng đếm',
  'Số lượng đạt',
];

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '');

const normalizeSheetName = (value: string) =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function parseBool(value: unknown): boolean {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'co' || raw === 'có' || raw === 'yes' || raw === 'y';
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 9999999999 ? value : value * 1000;
  }
  const raw = String(value ?? '').trim();
  if (!raw) return Date.now();
  const dt = new Date(raw);
  if (!Number.isNaN(dt.getTime())) return dt.getTime();
  return Date.now();
}

function extractSubmissionRows(rawRows: Array<Record<string, unknown>>) {
  if (!rawRows.length) {
    throw new Error('File nộp vị trí trống dữ liệu.');
  }

  const headerMap = new Map<string, string>();
  Object.keys(rawRows[0]).forEach((key) => headerMap.set(normalizeHeader(key), key));

  const getKey = (name: keyof typeof HEADER_KEYS) => headerMap.get(HEADER_KEYS[name]);
  const requiredKeys = [getKey('dataCycleCode'), getKey('snapshotId'), getKey('sourceFileName'), getKey('warehouseName'), getKey('locationCode'), getKey('itemCode'), getKey('countTotal'), getKey('countUsable')];

  if (requiredKeys.some((k) => !k)) {
    throw new Error(`Sai cấu trúc file nộp vị trí. Cần đủ cột bắt buộc: ${REQUIRED_HEADERS.join(', ')}.`);
  }

  const locationNameKey = getKey('locationName');
  const snapshotDateKey = getKey('snapshotDate');
  const outOfScopeKey = getKey('outOfScope');
  const updatedAtKey = getKey('updatedAt');

  const seenItemCodes = new Set<string>();
  const locationCodes = new Set<string>();
  const rows: LocationSubmissionRow[] = [];
  let rowMeta: LocationExchangeMeta | null = null;

  for (let i = 0; i < rawRows.length; i += 1) {
    const row = rawRows[i];
    const rowNo = i + 2;

    const dataCycleCode = String(row[requiredKeys[0] as string] ?? '').trim();
    const snapshotId = String(row[requiredKeys[1] as string] ?? '').trim();
    const sourceFileName = String(row[requiredKeys[2] as string] ?? '').trim();
    const warehouseName = String(row[requiredKeys[3] as string] ?? '').trim();
    const locationCode = String(row[requiredKeys[4] as string] ?? '').trim();
    const itemCode = String(row[requiredKeys[5] as string] ?? '').trim();
    const countTotal = parseNumber(row[requiredKeys[6] as string]);
    const countUsable = parseNumber(row[requiredKeys[7] as string]);
    const locationName = locationNameKey ? String(row[locationNameKey] ?? '').trim() : locationCode;
    const snapshotDate = snapshotDateKey ? String(row[snapshotDateKey] ?? '').trim() : '';
    const outOfScope = outOfScopeKey ? parseBool(row[outOfScopeKey]) : false;
    const updatedAt = updatedAtKey ? parseTimestamp(row[updatedAtKey]) : Date.now();

    if (!itemCode && !locationCode) continue;
    if (!dataCycleCode || !snapshotId || !sourceFileName || !warehouseName || !locationCode || !itemCode) {
      throw new Error(`Dòng ${rowNo} thiếu dữ liệu bắt buộc.`);
    }

    const itemNorm = normalizeHeader(itemCode);
    if (seenItemCodes.has(itemNorm)) {
      throw new Error(`Dòng ${rowNo} trùng Mã hàng ${itemCode} trong cùng file nộp.`);
    }
    seenItemCodes.add(itemNorm);
    locationCodes.add(locationCode);

    if (!rowMeta) {
      rowMeta = {
        dataCycleCode,
        snapshotId,
        sourceFileName,
        warehouseName,
        locationCode,
        locationName: locationName || locationCode,
        snapshotDate,
      };
    }

    rows.push({
      itemCode,
      countTotal,
      countUsable,
      outOfScope,
      updatedAt,
    });
  }

  if (!rowMeta || rows.length === 0) {
    throw new Error('File nộp vị trí không có dòng dữ liệu hợp lệ.');
  }
  if (locationCodes.size > 1) {
    throw new Error('File nộp chỉ được chứa một Mã vị trí.');
  }

  return { meta: rowMeta, rows };
}

export async function pickAndParseLocationSubmissionFile(): Promise<
  | {
      fileName: string;
      meta: LocationExchangeMeta;
      rows: LocationSubmissionRow[];
    }
  | null
> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [
      'text/csv',
      'text/comma-separated-values',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const fileName = asset.name || 'nop_vi_tri';
  const uri = asset.uri;
  const ext = fileName.toLowerCase().split('.').pop();

  if (ext === 'csv') {
    const text = await FileSystem.readAsStringAsync(uri);
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    const { meta, rows } = extractSubmissionRows(parsed.data || []);
    return { fileName, meta, rows };
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const workbook = XLSX.read(b64, { type: 'base64' });
    const preferred = workbook.SheetNames.find(
      (name) => normalizeSheetName(name) === normalizeSheetName(SUBMISSION_SHEET_NAME),
    );
    if (!preferred && workbook.SheetNames.length > 1) {
      throw new Error(`File nhiều sheet. Nút nạp file nộp chỉ nhận sheet "${SUBMISSION_SHEET_NAME}".`);
    }
    const target = preferred || workbook.SheetNames[0];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[target], { defval: '' });
    const { meta, rows } = extractSubmissionRows(records || []);
    return { fileName, meta, rows };
  }

  throw new Error('Định dạng chưa hỗ trợ. Vui lòng dùng CSV hoặc Excel (.xlsx/.xls).');
}
