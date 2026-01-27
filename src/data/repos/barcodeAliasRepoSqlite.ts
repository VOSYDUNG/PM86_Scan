import { BarcodeAliasRepo } from '@/domain/usecases/ports';
import { getDb } from '@/data/sqlite/db';

export function barcodeAliasRepoSqlite(): BarcodeAliasRepo {
  return {
    async getItemKeyByBarcode(barcode: string) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ itemKey: string }>(
        'SELECT itemKey FROM barcode_alias WHERE barcode = ? LIMIT 1',
        [barcode],
      );
      return row?.itemKey;
    },

    async upsertAlias(params) {
      const db = await getDb();
      await db.runAsync(
        'INSERT INTO barcode_alias (barcode, itemKey, createdAt) VALUES (?, ?, ?)\n         ON CONFLICT(barcode) DO UPDATE SET itemKey=excluded.itemKey',
        [params.barcode, params.itemKey, params.createdAt],
      );
    },
  };
}
