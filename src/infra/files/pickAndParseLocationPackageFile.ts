import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { LocationExchangeMeta, LocationPackageItem } from '@/domain/entities/types';

const META_SHEET = 'THONG_TIN_GOI';
const ITEMS_SHEET = 'DANH_SACH_KIEM_KE_VI_TRI';

const normalizeText = (value: string) =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');

function readMetaSheet(sheet: XLSX.WorkSheet): LocationExchangeMeta {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (!rows.length) {
    throw new Error('Sheet THONG_TIN_GOI đang trống.');
  }
  const first = rows[0];
  const keyMap = new Map<string, string>();
  Object.keys(first).forEach((key) => keyMap.set(normalizeText(key), key));

  const resolve = (label: string) => {
    const key = keyMap.get(normalizeText(label));
    return key ? String(first[key] ?? '').trim() : '';
  };

  const dataCycleCode = resolve('Mã kỳ dữ liệu');
  const snapshotId = resolve('Mã snapshot nguồn');
  const sourceFileName = resolve('Tên file nguồn');
  const warehouseName = resolve('Tên kho');
  const locationCode = resolve('Mã vị trí');
  const locationName = resolve('Tên vị trí');
  const snapshotDate = resolve('Ngày chốt dữ liệu');

  if (!dataCycleCode || !snapshotId || !sourceFileName || !warehouseName || !locationCode) {
    throw new Error('Thiếu metadata bắt buộc trong sheet THONG_TIN_GOI.');
  }

  return {
    dataCycleCode,
    snapshotId,
    sourceFileName,
    warehouseName,
    locationCode,
    locationName: locationName || locationCode,
    snapshotDate,
  };
}

function readItemsSheet(sheet: XLSX.WorkSheet): LocationPackageItem[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (!rows.length) {
    throw new Error('Sheet DANH_SACH_KIEM_KE_VI_TRI đang trống.');
  }

  const keyMap = new Map<string, string>();
  Object.keys(rows[0]).forEach((key) => keyMap.set(normalizeText(key), key));
  const itemCodeKey = keyMap.get(normalizeText('Mã hàng'));
  const itemNameKey = keyMap.get(normalizeText('Tên hàng'));
  const uomKey = keyMap.get(normalizeText('ĐVT'));
  const onHandKey = keyMap.get(normalizeText('SL tồn cuối kỳ'));
  if (!itemCodeKey || !itemNameKey || !uomKey || !onHandKey) {
    throw new Error('Sheet DANH_SACH_KIEM_KE_VI_TRI thiếu cột bắt buộc: Mã hàng, Tên hàng, ĐVT, SL tồn cuối kỳ.');
  }

  const items: LocationPackageItem[] = [];
  for (const row of rows) {
    const itemCode = String(row[itemCodeKey] ?? '').trim();
    const itemName = String(row[itemNameKey] ?? '').trim();
    const uom = String(row[uomKey] ?? '').trim();
    const qtyRaw = String(row[onHandKey] ?? '').trim();
    if (!itemCode && !itemName) continue;
    const qty = Number(qtyRaw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
    items.push({
      itemCode,
      itemName,
      uom,
      onHandQty: Number.isFinite(qty) ? qty : 0,
    });
  }
  if (!items.length) {
    throw new Error('Sheet DANH_SACH_KIEM_KE_VI_TRI không có dữ liệu hàng.');
  }
  return items;
}

export async function pickAndParseLocationPackageFile(): Promise<
  | {
      fileName: string;
      meta: LocationExchangeMeta;
      items: LocationPackageItem[];
    }
  | null
> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const fileName = asset.name || 'goi_kiem_ke_vi_tri.xlsx';
  const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  const workbook = XLSX.read(b64, { type: 'base64' });

  const metaName = workbook.SheetNames.find((name) => normalizeText(name) === normalizeText(META_SHEET));
  const itemsName = workbook.SheetNames.find((name) => normalizeText(name) === normalizeText(ITEMS_SHEET));
  if (!metaName || !itemsName) {
    throw new Error(`File gói vị trí phải có đủ 2 sheet: ${META_SHEET} và ${ITEMS_SHEET}.`);
  }

  const meta = readMetaSheet(workbook.Sheets[metaName]);
  const items = readItemsSheet(workbook.Sheets[itemsName]);
  return { fileName, meta, items };
}
