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

  const recalcLocationProgress = async (sessionId: string, locationId: string) => {
    const db = await getDb();
    const stats = await db.getFirstAsync<{
      expectedLines: number;
      countedLines: number;
      countedLinesInScope: number;
      outOfScopeCount: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM location_scope_items WHERE sessionId = ? AND locationId = ?) AS expectedLines,
        (SELECT COUNT(*) FROM count_lines WHERE sessionId = ? AND locationId = ?) AS countedLines,
        (SELECT COUNT(*) FROM count_lines WHERE sessionId = ? AND locationId = ? AND isOutOfScope = 0) AS countedLinesInScope,
        (SELECT COUNT(*) FROM count_lines WHERE sessionId = ? AND locationId = ? AND isOutOfScope = 1) AS outOfScopeCount`,
      [sessionId, locationId, sessionId, locationId, sessionId, locationId, sessionId, locationId],
    );

    const expectedLines = stats?.expectedLines ?? 0;
    const countedLines = stats?.countedLines ?? 0;
    const countedLinesInScope = stats?.countedLinesInScope ?? 0;
    const outOfScopeCount = stats?.outOfScopeCount ?? 0;
    const uncountedLines = Math.max(expectedLines - countedLinesInScope, 0);

    let status: 'PENDING' | 'IN_PROGRESS' | 'DONE' = 'PENDING';
    if (countedLines > 0) {
      status = expectedLines > 0 && countedLinesInScope >= expectedLines ? 'DONE' : 'IN_PROGRESS';
    }

    await db.runAsync(
      `UPDATE location_counts
       SET status = CASE WHEN status = 'LOCKED' THEN status ELSE ? END,
           updatedAt = ?,
           progress = ?
       WHERE sessionId = ? AND locationId = ?`,
      [
        status,
        Date.now(),
        JSON.stringify({ expectedLines, countedLines, uncountedLines, outOfScopeCount }),
        sessionId,
        locationId,
      ],
    );
  };

  const getScopeState = async (sessionId: string, locationId: string, itemKey: string) => {
    const db = await getDb();
    const hasMappingRow = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM location_scope_items WHERE sessionId = ? AND locationId = ?',
      [sessionId, locationId],
    );
    const hasMapping = (hasMappingRow?.n ?? 0) > 0;
    if (!hasMapping) {
      return { inScope: true, hasMapping: false };
    }
    const inScopeRow = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM location_scope_items WHERE sessionId = ? AND locationId = ? AND itemKey = ?',
      [sessionId, locationId, itemKey],
    );
    return { inScope: (inScopeRow?.n ?? 0) > 0, hasMapping: true };
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

    async upsertCountLine({ sessionId, locationId, itemKey, mode, qty, exceptions }, opts) {
      const db = await getDb();
      
      // 1. Get current (to handle + accumulate mode)
      const current = await db.getFirstAsync<any>(
        'SELECT countTotal, exceptions, isOutOfScope FROM count_lines WHERE sessionId = ? AND locationId = ? AND itemKey = ?',
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
      const scope = await getScopeState(sessionId, locationId, itemKey);
      const outOfScopeFlag = opts?.isOutOfScope ?? (scope.hasMapping && !scope.inScope);

      // 3. Execute INSERT OR REPLACE (Robust Upsert)
      try {
        await db.runAsync(
          `INSERT OR REPLACE INTO count_lines (sessionId, locationId, itemKey, countTotal, countUsable, exceptions, isOutOfScope, state, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sessionId,
            locationId,
            itemKey,
            newTotal,
            usable,
            JSON.stringify(finalEx),
            outOfScopeFlag ? 1 : 0,
            state,
            now,
          ]
        );
      } catch (sqlError) {
        console.error('SQL Upsert Error:', sqlError);
        throw new Error(`Lỗi lưu DB: ${String(sqlError)}`);
      }

      // 4. Update Location Progress based on scope mapping.
      try {
        await recalcLocationProgress(sessionId, locationId);
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
    },

    async isItemInLocationScope({ sessionId, locationId, itemKey }) {
      return getScopeState(sessionId, locationId, itemKey);
    }
  };
}
