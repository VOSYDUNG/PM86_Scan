import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type ParsedScopeRow = {
  locationCode: string;
  itemCode: string;
  locationName?: string;
  itemName?: string;
  uom?: string;
  warehouseName?: string;
  snapshotId?: string;
  sourceFileName?: string;
  snapshotDate?: string;
  note?: string;
};

const LOCATION_SCOPE_SHEET_NAME = 'DANH_MUC_VI_TRI_SKU';

const FIELD_HEADERS = {
  locationCode: 'mavitri',
  itemCode: 'mahang',
  locationName: 'tenvitri',
  itemName: 'tenhang',
  uom: 'dvt',
  warehouseName: 'tenkho',
  snapshotId: 'masnapshotnguon',
  sourceFileName: 'tenfilenguon',
  snapshotDate: 'ngaychotdulieu',
  note: 'ghichudieuphoi',
} as const;

const REQUIRED_SCOPE_COLUMNS = ['Mã vị trí', 'Mã hàng'];

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

function extractRows(rawRows: Array<Record<string, unknown>>): ParsedScopeRow[] {
  if (!rawRows.length) return [];
  const headerMap = new Map<string, string>();
  Object.keys(rawRows[0]).forEach((key) => headerMap.set(normalizeHeader(key), key));

  const locationKey = headerMap.get(FIELD_HEADERS.locationCode);
  const itemKey = headerMap.get(FIELD_HEADERS.itemCode);

  if (!locationKey || !itemKey) {
    throw new Error(`Sai cấu trúc danh mục vị trí-SKU. Cần đủ cột bắt buộc: ${REQUIRED_SCOPE_COLUMNS.join(', ')}.`);
  }

  const locationNameKey = headerMap.get(FIELD_HEADERS.locationName);
  const itemNameKey = headerMap.get(FIELD_HEADERS.itemName);
  const uomKey = headerMap.get(FIELD_HEADERS.uom);
  const warehouseKey = headerMap.get(FIELD_HEADERS.warehouseName);
  const snapshotIdKey = headerMap.get(FIELD_HEADERS.snapshotId);
  const sourceFileKey = headerMap.get(FIELD_HEADERS.sourceFileName);
  const snapshotDateKey = headerMap.get(FIELD_HEADERS.snapshotDate);
  const noteKey = headerMap.get(FIELD_HEADERS.note);

  const rows: ParsedScopeRow[] = [];
  for (const row of rawRows) {
    const locationCode = String(row[locationKey] ?? '').trim();
    const itemCode = String(row[itemKey] ?? '').trim();
    const locationName = locationNameKey ? String(row[locationNameKey] ?? '').trim() : '';
    const itemName = itemNameKey ? String(row[itemNameKey] ?? '').trim() : '';
    const uom = uomKey ? String(row[uomKey] ?? '').trim() : '';
    const warehouseName = warehouseKey ? String(row[warehouseKey] ?? '').trim() : '';
    const snapshotId = snapshotIdKey ? String(row[snapshotIdKey] ?? '').trim() : '';
    const sourceFileName = sourceFileKey ? String(row[sourceFileKey] ?? '').trim() : '';
    const snapshotDate = snapshotDateKey ? String(row[snapshotDateKey] ?? '').trim() : '';
    const note = noteKey ? String(row[noteKey] ?? '').trim() : '';
    if (!locationCode && !itemCode) continue;
    rows.push({
      locationCode,
      itemCode,
      locationName: locationName || undefined,
      itemName: itemName || undefined,
      uom: uom || undefined,
      warehouseName: warehouseName || undefined,
      snapshotId: snapshotId || undefined,
      sourceFileName: sourceFileName || undefined,
      snapshotDate: snapshotDate || undefined,
      note: note || undefined,
    });
  }
  return rows;
}

export async function pickAndParseLocationScopeFile(): Promise<
  | {
      fileName: string;
      rows: ParsedScopeRow[];
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
  const fileName = asset.name || 'location_scope_import';
  const uri = asset.uri;
  const ext = fileName.toLowerCase().split('.').pop();

  if (ext === 'csv') {
    const text = await FileSystem.readAsStringAsync(uri);
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const headerKeys = Object.keys((parsed.data?.[0] as Record<string, unknown>) || {}).map((k) => normalizeHeader(k));
    const isSubmission = headerKeys.includes('makydulieu') && headerKeys.includes('soluongdem');
    if (isSubmission) {
      throw new Error('Đây là file nộp vị trí. Vui lòng nạp tại chức năng Nạp file nộp vị trí.');
    }
    const rows = extractRows(parsed.data || []);
    return { fileName, rows };
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const workbook = XLSX.read(b64, { type: 'base64' });
    const normalizedSheets = workbook.SheetNames.map((name) => normalizeSheetName(name));
    if (normalizedSheets.includes(normalizeSheetName('NOP_VI_TRI_KIEM_KE'))) {
      throw new Error('Đây là file nộp vị trí. Vui lòng nạp tại chức năng Nạp file nộp vị trí.');
    }
    if (
      normalizedSheets.includes(normalizeSheetName('THONG_TIN_GOI')) &&
      normalizedSheets.includes(normalizeSheetName('DANH_SACH_KIEM_KE_VI_TRI'))
    ) {
      throw new Error('Đây là gói kiểm kê vị trí. Vui lòng nạp tại Trang chủ > Nạp gói vị trí.');
    }
    const preferred = workbook.SheetNames.find(
      (name) => normalizeSheetName(name) === normalizeSheetName(LOCATION_SCOPE_SHEET_NAME),
    );
    if (!preferred && workbook.SheetNames.length > 1) {
      throw new Error(
        `File nhiều sheet. Nút "Nạp danh mục vị trí-SKU" chỉ nhận sheet "${LOCATION_SCOPE_SHEET_NAME}".`,
      );
    }
    const candidate = preferred || workbook.SheetNames[0];
    const sheet = workbook.Sheets[candidate];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const rows = extractRows(records || []);
    return { fileName, rows };
  }

  throw new Error('Định dạng chưa hỗ trợ. Vui lòng dùng CSV hoặc Excel (.xlsx/.xls).');
}
