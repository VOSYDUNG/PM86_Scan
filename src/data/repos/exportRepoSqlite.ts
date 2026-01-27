import { ExportRepo } from '@/domain/usecases/ports';
import { getDb } from '@/data/sqlite/db';

export function exportRepoSqlite(): ExportRepo {
  return {
    async getExportRows(params) {
      const db = await getDb();
      
      const rows = await db.getAllAsync<{
        warehouseName: string;
        itemCode: string;
        itemName: string;
        uom: string;
        onHandQty: number;
        actualQty: number | null;
        diffQty: number | null;
        note: string | null;
      }>(
        `
        WITH AggregatedTotals AS (
          SELECT 
            itemKey,
            SUM(countUsable) as totalUsable
          FROM count_lines
          WHERE sessionId = ?
          GROUP BY itemKey
        )
        SELECT 
            s.warehouseName, 
            s.itemCode, 
            s.itemName, 
            s.uom, 
            s.onHandQty,
            c.totalUsable as actualQty,
            (IFNULL(c.totalUsable, 0) - s.onHandQty) as diffQty,
            NULL as note
        FROM snapshot_rows s
        LEFT JOIN AggregatedTotals c
           ON c.itemKey = s.itemKey
        WHERE s.snapshotId = ? AND s.warehouseName = ?
        ORDER BY s.itemName ASC, s.itemCode ASC
        `,
        [params.sessionId, params.snapshotId, params.warehouseName],
      );
      
      return rows.map(r => ({
        ...r,
        diffQty: r.actualQty !== null ? (r.actualQty - r.onHandQty) : null 
      }));
    },

    async getExportSummaryRows(params) {
      const db = await getDb();
      const rows = await db.getAllAsync<{
        warehouseName: string;
        itemCode: string;
        itemName: string;
        uom: string;
        onHandQty: number;
        totalCount: number | null;
        totalUsable: number | null;
      }>(
        `
        WITH AggregatedTotals AS (
          SELECT 
            itemKey,
            SUM(countTotal) as totalCount,
            SUM(countUsable) as totalUsable
          FROM count_lines
          WHERE sessionId = ?
          GROUP BY itemKey
        )
        SELECT 
            s.warehouseName, 
            s.itemCode, 
            s.itemName, 
            s.uom, 
            s.onHandQty,
            c.totalCount as totalCount,
            c.totalUsable as totalUsable
        FROM snapshot_rows s
        LEFT JOIN AggregatedTotals c
           ON c.itemKey = s.itemKey
        WHERE s.snapshotId = ? AND s.warehouseName = ?
        ORDER BY s.itemName ASC, s.itemCode ASC
        `,
        [params.sessionId, params.snapshotId, params.warehouseName],
      );
      return rows;
    },

    async getExportDetailRows(params) {
      const db = await getDb();
      const rows = await db.getAllAsync<{
        warehouseName: string;
        locationCode: string | null;
        locationName: string | null;
        locationType: string | null;
        itemKey: string;
        itemCode: string | null;
        itemName: string | null;
        uom: string | null;
        onHandQty: number | null;
        countTotal: number | null;
        countUsable: number | null;
        exceptions: string | null;
        updatedAt: number | null;
      }>(
        `
        SELECT 
          s.warehouseName as warehouseName,
          l.code as locationCode,
          l.displayName as locationName,
          l.type as locationType,
          cl.itemKey as itemKey,
          s.itemCode as itemCode,
          s.itemName as itemName,
          s.uom as uom,
          s.onHandQty as onHandQty,
          cl.countTotal as countTotal,
          cl.countUsable as countUsable,
          cl.exceptions as exceptions,
          cl.updatedAt as updatedAt
        FROM count_lines cl
        JOIN locations l ON l.id = cl.locationId
        LEFT JOIN snapshot_rows s 
          ON s.itemKey = cl.itemKey 
         AND s.snapshotId = ? 
         AND s.warehouseName = ?
        WHERE cl.sessionId = ?
        ORDER BY l.displayName ASC, s.itemName ASC, s.itemCode ASC
        `,
        [params.snapshotId, params.warehouseName, params.sessionId],
      );
      return rows;
    },

    async getExportStats(params) {
      const db = await getDb();
      // Total Rows
      const totalRes = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) as n FROM snapshot_rows WHERE snapshotId = ? AND warehouseName = ?',
        [params.snapshotId, params.warehouseName]
      );
      
      // Scanned & Diff
      const stats = await db.getFirstAsync<{ scanned: number; diffs: number }>(
        `
        WITH AggregatedTotals AS (
          SELECT itemKey, SUM(countUsable) as totalUsable
          FROM count_lines
          WHERE sessionId = ?
          GROUP BY itemKey
        )
        SELECT 
           COUNT(c.itemKey) as scanned,
           SUM(CASE WHEN (c.totalUsable - s.onHandQty) != 0 THEN 1 ELSE 0 END) as diffs
        FROM snapshot_rows s
        JOIN AggregatedTotals c ON c.itemKey = s.itemKey
        WHERE s.snapshotId = ? AND s.warehouseName = ?
        `,
        [params.sessionId, params.snapshotId, params.warehouseName]
      );
      
      return {
        total: totalRes?.n || 0,
        scanned: stats?.scanned || 0,
        diffCount: stats?.diffs || 0
      };
    },

    async getExportTotal(params) {
      const db = await getDb();
      const args: any[] = [params.sessionId, params.snapshotId, params.warehouseName];
      let whereClause = 'WHERE s.snapshotId = ? AND s.warehouseName = ?';

      if (params.diffOnly) {
        whereClause += ' AND c.totalUsable IS NOT NULL AND (c.totalUsable - s.onHandQty) != 0';
      }

      if (params.search) {
        whereClause += ' AND (s.itemCode LIKE ? OR s.itemName LIKE ?)';
        const term = `%${params.search}%`;
        args.push(term, term);
      }

      const row = await db.getFirstAsync<{ n: number }>(
        `
        WITH AggregatedTotals AS (
          SELECT itemKey, SUM(countUsable) as totalUsable
          FROM count_lines
          WHERE sessionId = ?
          GROUP BY itemKey
        )
        SELECT COUNT(*) as n
        FROM snapshot_rows s
        LEFT JOIN AggregatedTotals c ON c.itemKey = s.itemKey
        ${whereClause}
        `,
        args
      );

      return row?.n || 0;
    },

    async searchExportRows(params) {
      const db = await getDb();
      const offset = params.offset || 0;
      const limit = params.limit || 50;
      
      const args: any[] = [params.sessionId, params.snapshotId, params.warehouseName];
      let whereClause = 'WHERE s.snapshotId = ? AND s.warehouseName = ?';
      
      if (params.diffOnly) {
         whereClause += ' AND c.totalUsable IS NOT NULL AND (c.totalUsable - s.onHandQty) != 0';
      }
      
      if (params.search) {
         whereClause += ' AND (s.itemCode LIKE ? OR s.itemName LIKE ?)';
         const term = `%${params.search}%`;
         args.push(term, term);
      }
      
      args.push(limit, offset);

      const rows = await db.getAllAsync<{
        warehouseName: string;
        itemCode: string;
        itemName: string;
        uom: string;
        onHandQty: number;
        actualQty: number | null;
        diffQty: number | null;
      }>(
        `
        WITH AggregatedTotals AS (
          SELECT itemKey, SUM(countUsable) as totalUsable
          FROM count_lines
          WHERE sessionId = ?
          GROUP BY itemKey
        )
        SELECT 
            s.warehouseName, 
            s.itemCode, 
            s.itemName, 
            s.uom, 
            s.onHandQty,
            c.totalUsable as actualQty,
            (IFNULL(c.totalUsable, 0) - s.onHandQty) as diffQty,
            NULL as note
        FROM snapshot_rows s
        LEFT JOIN AggregatedTotals c ON c.itemKey = s.itemKey
        ${whereClause}
        ORDER BY s.itemName ASC, s.itemCode ASC
        LIMIT ? OFFSET ?
        `,
        args
      );

      return rows.map(r => ({
        ...r,
        diffQty: r.actualQty !== null ? (r.actualQty - r.onHandQty) : null,
        note: null
      }));
    },
  };
}
