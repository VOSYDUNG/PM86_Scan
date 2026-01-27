import { CountRepo } from '@/domain/usecases/ports';
import { CountException } from '@/domain/entities/types';
import { getDb } from '@/data/sqlite/db';

export function countRepoSqlite(): CountRepo {
  const parseExceptions = (raw: unknown): CountException[] => {
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? (parsed as CountException[]) : [];
    } catch {
      return [];
    }
  };

  return {
    async getCountLine({ sessionId, locationId, itemKey }) {
      const db = await getDb();
      const row = await db.getFirstAsync<any>(
        'SELECT * FROM count_lines WHERE sessionId = ? AND locationId = ? AND itemKey = ?',
        [sessionId, locationId, itemKey]
      );
      if (!row) return undefined;
      return {
        countTotal: row.countTotal,
        exceptions: parseExceptions(row.exceptions),
        countUsable: row.countUsable,
        state: row.state,
      };
    },

    async upsertCountLine({ sessionId, locationId, itemKey, mode, qty, exceptions }) {
      const db = await getDb();
      
      // 1. Get current (to handle + accumulate mode)
      const current = await db.getFirstAsync<any>(
        'SELECT countTotal, exceptions FROM count_lines WHERE sessionId = ? AND locationId = ? AND itemKey = ?',
        [sessionId, locationId, itemKey]
      );

      const currentVal = current ? (current.countTotal || 0) : 0;
      const currentEx = parseExceptions(current?.exceptions);

      // 2. Calculate
      let newTotal = qty;
      if (mode === 'accumulate') {
        newTotal = currentVal + qty;
      }

      const finalEx = exceptions !== undefined ? exceptions : currentEx;
      const badQty = finalEx.reduce((sum: number, e: any) => sum + (e.qty || 0), 0);
      const usable = newTotal - badQty;
      // A saved line is considered counted even if qty = 0
      const state = 'COUNTED';
      const now = Date.now();

      // 3. Execute INSERT OR REPLACE (Robust Upsert)
      try {
        await db.runAsync(
          `INSERT OR REPLACE INTO count_lines (sessionId, locationId, itemKey, countTotal, countUsable, exceptions, state, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [sessionId, locationId, itemKey, newTotal, usable, JSON.stringify(finalEx), state, now]
        );
      } catch (sqlError) {
        console.error('SQL Upsert Error:', sqlError);
        throw new Error(`Lỗi lưu DB: ${String(sqlError)}`);
      }

      // 4. Update Location Progress (Manual JSON handling for compatibility)
      try {
        const stats = await db.getFirstAsync<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM count_lines 
           WHERE sessionId = ? AND locationId = ?`,
          [sessionId, locationId]
        );
        const countedLines = stats?.cnt || 0;

        // Get current location count row
        const locRow = await db.getFirstAsync<{ progress: string }>(
          'SELECT progress FROM location_counts WHERE sessionId = ? AND locationId = ?',
          [sessionId, locationId]
        );

        let progressObj = { expectedLines: 0, countedLines: 0, uncountedLines: 0 };
        if (locRow?.progress) {
          try {
            progressObj = JSON.parse(locRow.progress);
          } catch (e) {}
        }
        
        progressObj.countedLines = countedLines;

        await db.runAsync(
          `UPDATE location_counts 
           SET status = CASE 
               WHEN status = 'LOCKED' THEN status
               WHEN ? > 0 THEN 'IN_PROGRESS'
               ELSE 'PENDING'
             END,
               updatedAt = ?,
               progress = ?
           WHERE sessionId = ? AND locationId = ?`,
          [countedLines, now, JSON.stringify(progressObj), sessionId, locationId]
        );
      } catch (e) {
        console.warn('Failed to update progress:', e);
      }

      return { actualQty: newTotal };
    },

    async findAllCountLinesForItem({ sessionId, itemKey }) {
      const db = await getDb();
      const rows = await db.getAllAsync<any>(
        'SELECT * FROM count_lines WHERE sessionId = ? AND itemKey = ?',
        [sessionId, itemKey]
      );
      return rows.map(r => ({
        locationId: r.locationId,
        countTotal: r.countTotal,
        countUsable: r.countUsable,
        exceptions: parseExceptions(r.exceptions),
        state: r.state,
        updatedAt: r.updatedAt
      }));
    }
  };
}
