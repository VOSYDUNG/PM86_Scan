import { getDb } from '@/data/sqlite/db';
import { newId } from '@/data/sqlite/id';
import { SnapshotRepo, SnapshotWriteRepo } from '@/domain/usecases/ports';

export function snapshotRepoSqlite(): SnapshotRepo & SnapshotWriteRepo {
  return {
    async hasSnapshot(snapshotId) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(1) as n FROM snapshots WHERE id = ?',
        [snapshotId],
      );
      return !!row && row.n > 0;
    },

    async createSnapshot(params) {
      const db = await getDb();
      const id = newId('snap');
      await db.runAsync(
        'INSERT INTO snapshots (id, snapshotAt, sourceFileName) VALUES (?, ?, ?)',
        [id, params.snapshotAt, params.sourceFileName],
      );
      return id;
    },

    async upsertSnapshotRows(params) {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM snapshot_rows WHERE snapshotId = ?', [params.snapshotId]);

        const sql =
          'INSERT INTO snapshot_rows (snapshotId, warehouseName, itemKey, itemCode, itemName, uom, onHandQty, nameNorm, codeNorm)\n' +
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

        for (const r of params.rows) {
          await db.runAsync(sql, [
            params.snapshotId,
            r.warehouseName,
            r.itemCode,
            r.itemCode,
            r.itemName,
            r.uom,
            r.onHandQty,
            r.nameNorm,
            r.codeNorm,
          ]);
        }
      });
    },

    async bulkUpsertSnapshot(params) {
      const db = await getDb();
      const rows = params.rows;
      const batchSize = params.options?.batchSize ?? 200;

      for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize);
        if (chunk.length === 0) continue;

        await db.withTransactionAsync(async () => {
          const valuePlaceholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
          const sql = `INSERT OR REPLACE INTO snapshot_rows (snapshotId, warehouseName, itemKey, itemCode, itemName, uom, onHandQty, nameNorm, codeNorm) VALUES ${valuePlaceholders}`;
          
          const args: any[] = [];
          chunk.forEach(r => {
             args.push(
               params.snapshotId,
               r.warehouseName,
               r.itemCode, // itemKey
               r.itemCode,
               r.itemName,
               r.uom,
               r.onHandQty,
               r.nameNorm,
               r.codeNorm
             );
          });
          
          await db.runAsync(sql, args);
        });
        
        // Optional: Yield to event loop if needed between batches, though transaction usually blocks.
        // But since we are inside an async function called by a chunked parser, the parser itself yields.
      }
    },

    async insertSingleSnapshotRow(params) {
      const db = await getDb();
      await db.runAsync(
        'INSERT INTO snapshot_rows (snapshotId, warehouseName, itemKey, itemCode, itemName, uom, onHandQty, nameNorm, codeNorm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          params.snapshotId,
          params.warehouseName,
          params.itemCode, // itemKey = itemCode
          params.itemCode,
          params.itemName,
          params.uom,
          params.onHandQty,
          params.nameNorm,
          params.codeNorm,
        ],
      );
    },

    async listWarehouses(params) {
      const db = await getDb();
      const rows = await db.getAllAsync<{ warehouseName: string }>(
        'SELECT DISTINCT warehouseName FROM snapshot_rows WHERE snapshotId = ? ORDER BY warehouseName ASC',
        [params.snapshotId],
      );
      return rows.map((r) => r.warehouseName);
    },

    async getRowByItemCode(params) {
      const db = await getDb();
      
      const row = await db.getFirstAsync<{
        itemKey: string;
        itemCode: string;
        itemName: string;
        uom: string;
        onHandQty: number;
      }>(
        'SELECT itemKey, itemCode, itemName, uom, onHandQty\n' +
          'FROM snapshot_rows\n' +
          'WHERE snapshotId = ? AND warehouseName = ? AND codeNorm = ?\n' +
          'LIMIT 1',
        [params.snapshotId, params.warehouseName, params.codeNorm],
      );
      
      return row ?? undefined;
    },

    async getRowByItemKey(params) {
      const db = await getDb();
      const row = await db.getFirstAsync<{
        itemKey: string;
        itemCode: string;
        itemName: string;
        uom: string;
        onHandQty: number;
      }>(
        'SELECT itemKey, itemCode, itemName, uom, onHandQty\n' +
          'FROM snapshot_rows\n' +
          'WHERE snapshotId = ? AND warehouseName = ? AND itemKey = ?\n' +
          'LIMIT 1',
        [params.snapshotId, params.warehouseName, params.itemKey],
      );
      return row ?? undefined;
    },

    async searchRows(params) {
      const db = await getDb();
      const qNoSpaces = params.queryNorm.replace(/\s+/g, '');
      const like1 = `%${qNoSpaces}%`;
      const like2 = `%${params.queryNorm}%`;

      const rows = await db.getAllAsync<{
        itemKey: string;
        itemCode: string;
        itemName: string;
        uom: string;
        onHandQty: number;
        nameNorm: string;
        codeNorm: string;
      }>(
        'SELECT itemKey, itemCode, itemName, uom, onHandQty, nameNorm, codeNorm\n' +
          'FROM snapshot_rows\n' +
          'WHERE snapshotId = ? AND warehouseName = ?\n' +
          'AND (codeNorm LIKE ? OR nameNorm LIKE ? OR itemName LIKE ?)\n' +
          'LIMIT ?',
        [params.snapshotId, params.warehouseName, like1, like1, like2, params.limit],
      );

      return rows;
    },

    async getAllSnapshots() {
      const db = await getDb();
      return await db.getAllAsync<{ id: string; snapshotAt: number; sourceFileName: string }>(
        'SELECT id, snapshotAt, sourceFileName FROM snapshots ORDER BY snapshotAt DESC'
      );
    },

    async getSnapshotMeta(snapshotId: string) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ id: string; snapshotAt: number; sourceFileName: string }>(
        'SELECT id, snapshotAt, sourceFileName FROM snapshots WHERE id = ? LIMIT 1',
        [snapshotId],
      );
      return row ?? undefined;
    },

    async renameSnapshot(snapshotId: string, sourceFileName: string) {
      const db = await getDb();
      await db.runAsync(
        'UPDATE snapshots SET sourceFileName = ? WHERE id = ?',
        [sourceFileName, snapshotId],
      );
    },

    async deleteSnapshot(snapshotId: string) {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        // 1. Get all sessions for this snapshot
        const sessions = await db.getAllAsync<{ id: string }>(
          'SELECT id FROM sessions WHERE snapshotId = ?',
          [snapshotId]
        );
        const sessionIds = sessions.map(s => s.id);

        if (sessionIds.length > 0) {
          // 2. Delete actual rows for these sessions
          // SQLite doesn't support array params easily, loop or use IN clause construction
          const placeholders = sessionIds.map(() => '?').join(',');
          await db.runAsync(
            `DELETE FROM actual_rows WHERE sessionId IN (${placeholders})`,
            sessionIds
          );
          await db.runAsync(
            `DELETE FROM count_lines WHERE sessionId IN (${placeholders})`,
            sessionIds
          );
          await db.runAsync(
            `DELETE FROM location_counts WHERE sessionId IN (${placeholders})`,
            sessionIds
          );
          await db.runAsync(
            `DELETE FROM location_scope_items WHERE sessionId IN (${placeholders})`,
            sessionIds
          );
          await db.runAsync(
            `DELETE FROM submission_import_logs WHERE sessionId IN (${placeholders})`,
            sessionIds
          );
          await db.runAsync(
            `DELETE FROM session_exchange_meta WHERE sessionId IN (${placeholders})`,
            sessionIds
          );
          
          // 3. Delete sessions
          await db.runAsync(
            `DELETE FROM sessions WHERE snapshotId = ?`,
            [snapshotId]
          );
        }

        // 4. Delete snapshot rows
        await db.runAsync('DELETE FROM snapshot_rows WHERE snapshotId = ?', [snapshotId]);

        // 5. Delete snapshot itself
        await db.runAsync('DELETE FROM snapshots WHERE id = ?', [snapshotId]);
      });
    },

    async countSnapshotRows(params) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) as n FROM snapshot_rows WHERE snapshotId = ? AND warehouseName = ?',
        [params.snapshotId, params.warehouseName]
      );
      return row?.n || 0;
    }
  };
}
