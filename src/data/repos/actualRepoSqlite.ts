import { ActualRepo } from '@/domain/usecases/ports';
import { getDb } from '@/data/sqlite/db';

export function actualRepoSqlite(): ActualRepo {
  return {
    async upsertActual(params) {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO actual_rows (sessionId, itemKey, actualQty, diffQty, reasonCode, reasonText, note, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(sessionId, itemKey) DO UPDATE SET
           actualQty=excluded.actualQty,
           diffQty=excluded.diffQty,
           reasonCode=excluded.reasonCode,
           reasonText=excluded.reasonText,
           note=excluded.note,
           updatedAt=excluded.updatedAt`,
        [
          params.sessionId,
          params.itemKey,
          params.actualQty,
          params.diffQty,
          params.reasonCode ?? null,
          params.reasonText ?? null,
          params.note ?? null,
          params.updatedAt,
        ],
      );
    },

    async getActual(params) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ actualQty: number; diffQty: number }>(
        'SELECT actualQty, diffQty FROM actual_rows WHERE sessionId = ? AND itemKey = ? LIMIT 1',
        [params.sessionId, params.itemKey],
      );
      return row ?? undefined;
    },
  };
}
