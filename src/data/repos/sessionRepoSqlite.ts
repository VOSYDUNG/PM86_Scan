import { CountSessionRepo } from '@/domain/usecases/ports';
import { getDb } from '@/data/sqlite/db';
import { newId } from '@/data/sqlite/id';

export function sessionRepoSqlite(): CountSessionRepo {
  return {
    async createSession(params) {
      const db = await getDb();
      const sessionId = newId('sess');
      const now = Date.now();

      await db.withTransactionAsync(async () => {
        // 1. Create Session
        await db.runAsync(
          'INSERT INTO sessions (id, snapshotId, warehouseName, createdAt) VALUES (?, ?, ?, ?)',
          [sessionId, params.snapshotId, params.warehouseName, now],
        );

        // 2. Resolve/Create Default Location (Root Warehouse)
        // Normalize warehouseName to generate a "safe" code
        // e.g. "Kho Chính" -> "WH_KHO_CHINH"
        const safeName = params.warehouseName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // remove accents
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_'); // replace non-alphanumeric with _
        
        const whCode = `WH_${safeName}`;
        
        let locId: string;
        
        // Check if location already exists (Global Master Data)
        const existing = await db.getFirstAsync<{id: string}>('SELECT id FROM locations WHERE code = ?', [whCode]);
        
        if (existing) {
          locId = existing.id;
        } else {
          locId = newId('loc');
          await db.runAsync(
            'INSERT INTO locations (id, code, displayName, type, status) VALUES (?, ?, ?, ?, ?)',
            [locId, whCode, params.warehouseName, 'WAREHOUSE', 'ACTIVE']
          );
        }

        // 3. Init LocationCount for this session
        await db.runAsync(
          `INSERT INTO location_counts (sessionId, locationId, status, progress, updatedAt) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            sessionId, 
            locId, 
            'PENDING', 
            JSON.stringify({ expectedLines: 0, countedLines: 0, uncountedLines: 0 }), 
            now
          ]
        );
      });

      return sessionId;
    },

    async listSessions(params) {
      const db = await getDb();
      const limit = params.limit ?? 20;
      const offset = params.offset ?? 0;
      const rows = await db.getAllAsync<{ id: string; createdAt: number }>(
        'SELECT id, createdAt FROM sessions WHERE snapshotId = ? AND warehouseName = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
        [params.snapshotId, params.warehouseName, limit, offset],
      );
      return rows;
    },

    async countSessions(params) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) as n FROM sessions WHERE snapshotId = ? AND warehouseName = ?',
        [params.snapshotId, params.warehouseName]
      );
      return row?.n || 0;
    },

    async deleteSession(sessionId: string) {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        // Delete legacy actual data
        await db.runAsync('DELETE FROM actual_rows WHERE sessionId = ?', [sessionId]);
        
        // Delete new Multi-Location data
        await db.runAsync('DELETE FROM count_lines WHERE sessionId = ?', [sessionId]);
        await db.runAsync('DELETE FROM location_counts WHERE sessionId = ?', [sessionId]);
        
        // Delete the session record
        await db.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
      });
    },

    async listLocationCounts(sessionId: string) {
      const db = await getDb();
      const rows = await db.getAllAsync<any>(
        `SELECT lc.*, l.displayName as locationName, l.code as locationCode, l.type as locationType 
         FROM location_counts lc 
         JOIN locations l ON lc.locationId = l.id 
         WHERE lc.sessionId = ? 
         ORDER BY lc.updatedAt DESC`,
        [sessionId]
      );
      
      return rows.map(r => {
        let progress = { expectedLines: 0, countedLines: 0, uncountedLines: 0 };
        if (r.progress) {
          try {
            progress = JSON.parse(r.progress);
          } catch {
            // keep defaults on malformed JSON
          }
        }
        return {
        sessionId: r.sessionId,
        locationId: r.locationId,
        status: r.status,
        progress,
        updatedAt: r.updatedAt,
        locationCode: r.locationCode,
        locationName: r.locationName,
        locationType: r.locationType
        };
      });
    },

    async ensureLocationInSession(params) {
      const db = await getDb();
      const now = Date.now();
      let locationId = '';

      await db.withTransactionAsync(async () => {
        // 1. Check master location
        const existing = await db.getFirstAsync<{id: string}>('SELECT id FROM locations WHERE code = ?', [params.locationCode]);
        
        if (existing) {
          locationId = existing.id;
        } else {
          locationId = newId('loc');
          await db.runAsync(
            'INSERT INTO locations (id, code, displayName, type, status) VALUES (?, ?, ?, ?, ?)',
            [
              locationId, 
              params.locationCode, 
              params.locationName || params.locationCode, 
              params.locationType || 'OTHER', 
              'ACTIVE'
            ]
          );
        }

        // 2. Check session link
        const linked = await db.getFirstAsync<{locationId: string}>(
          'SELECT locationId FROM location_counts WHERE sessionId = ? AND locationId = ?',
          [params.sessionId, locationId]
        );

        if (!linked) {
          await db.runAsync(
            `INSERT INTO location_counts (sessionId, locationId, status, progress, updatedAt) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              params.sessionId, 
              locationId, 
              'PENDING', 
              JSON.stringify({ expectedLines: 0, countedLines: 0, uncountedLines: 0 }), 
              now
            ]
          );
        }
      });

      return locationId;
    },
  };
}
