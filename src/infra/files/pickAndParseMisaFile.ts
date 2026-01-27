import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import { MisaImportRow } from '@/domain/entities/types';
import { parseMisaAoa } from '@/infra/files/misaParser';

export async function pickAndParseMisaFile(): Promise<
  | {
      fileName: string;
      rows: MisaImportRow[];
      uri: string;
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ],
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  const fileName = asset.name || 'misa_import';
  const uri = asset.uri;
  const ext = fileName.toLowerCase().split('.').pop();

  let rows: MisaImportRow[] = [];
  let aoa: unknown[][] = [];

  try {
    if (ext === 'csv') {
      const text = await FileSystem.readAsStringAsync(uri);
      const parsed = Papa.parse(text, { skipEmptyLines: true });
      aoa = (parsed.data as unknown[][]) ?? [];
    } else if (ext === 'xlsx' || ext === 'xls') {
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const workbook = XLSX.read(b64, { type: 'base64' });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Convert to Array of Arrays
      aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    } else {
      throw new Error('Định dạng file không hỗ trợ. Vui lòng chọn .csv hoặc .xlsx');
    }

    rows = parseMisaAoa(aoa);

  } catch (e) {
    console.error('File parsing error:', e);
    throw new Error('Lỗi đọc file: ' + String(e));
  }

  return { fileName, rows, uri };
}
