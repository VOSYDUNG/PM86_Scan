import { CountSessionRepo } from '@/domain/usecases/ports';
import { getDb } from '@/data/sqlite/db';
import { newId } from '@/data/sqlite/id';
import { normKey } from '@/domain/utils/normalize';

const DEFAULT_PROGRESS = { expectedLines: 0, countedLines: 0, uncountedLines: 0, outOfScopeCount: 0 };

const normalizeMetaValue = (value: string) => normKey((value || '').trim());

const stripFileExtension = (name: string) => {
  const trimmed = (name || '').trim();
  return trimmed.replace(/\.[^./\\]+$/i, '');
};

const parseDateOnly = (input?: string): string | null => {
  const raw = (input || '').trim();
  if (!raw) return null;

  const ymd = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};

async function recalcLocationProgress(db: Awaited<ReturnType<typeof getDb>>, sessionId: string, locationId: string) {
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
         progress = ?,
         updatedAt = ?
     WHERE sessionId = ? AND locationId = ?`,
    [
      status,
      JSON.stringify({ expectedLines, countedLines, uncountedLines, outOfScopeCount }),
      Date.now(),
      sessionId,
      locationId,
    ],
  );
}

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
            JSON.stringify(DEFAULT_PROGRESS), 
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
        await db.runAsync('DELETE FROM location_scope_items WHERE sessionId = ?', [sessionId]);
        await db.runAsync('DELETE FROM location_counts WHERE sessionId = ?', [sessionId]);
        await db.runAsync('DELETE FROM submission_import_logs WHERE sessionId = ?', [sessionId]);
        await db.runAsync('DELETE FROM session_exchange_meta WHERE sessionId = ?', [sessionId]);
        
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
        let progress = { ...DEFAULT_PROGRESS };
        if (r.progress) {
          try {
            progress = { ...DEFAULT_PROGRESS, ...JSON.parse(r.progress) };
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
              JSON.stringify(DEFAULT_PROGRESS), 
              now
            ]
          );
        }
      });

      return locationId;
    },

    async updateLocationName(params) {
      const db = await getDb();
      await db.runAsync(
        'UPDATE locations SET displayName = ? WHERE id = ?',
        [params.locationName, params.locationId]
      );
    },

    async removeLocationFromSession(params) {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'DELETE FROM count_lines WHERE sessionId = ? AND locationId = ?',
          [params.sessionId, params.locationId]
        );
        await db.runAsync(
          'DELETE FROM location_scope_items WHERE sessionId = ? AND locationId = ?',
          [params.sessionId, params.locationId]
        );
        await db.runAsync(
          'DELETE FROM location_counts WHERE sessionId = ? AND locationId = ?',
          [params.sessionId, params.locationId]
        );
      });
    },

    async importLocationScope(params) {
      const db = await getDb();
      const now = Date.now();
      const snapshotMeta = await db.getFirstAsync<{ sourceFileName: string; snapshotAt: number }>(
        'SELECT sourceFileName, snapshotAt FROM snapshots WHERE id = ?',
        [params.snapshotId],
      );
      const expectedWarehouseNorm = normalizeMetaValue(params.warehouseName);
      const expectedSnapshotNorm = normalizeMetaValue(params.snapshotId);
      const expectedSourceNorm = normalizeMetaValue(stripFileExtension(snapshotMeta?.sourceFileName ?? ''));
      const expectedSnapshotDate = snapshotMeta ? new Date(snapshotMeta.snapshotAt).toISOString().slice(0, 10) : null;

      let inserted = 0;
      let ignoredDuplicates = 0;
      let createdLocations = 0;
      const invalidRows: Array<{ row: number; locationCode?: string; itemCode?: string; reason: string }> = [];
      const linkedLocations = new Set<string>();

      const findOrCreateLocation = async (locationCode: string, locationName?: string) => {
        const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM locations WHERE code = ?', [locationCode]);
        if (existing) return existing.id;
        const locationId = newId('loc');
        await db.runAsync(
          'INSERT INTO locations (id, code, displayName, type, status) VALUES (?, ?, ?, ?, ?)',
          [locationId, locationCode, locationName || locationCode, 'OTHER', 'ACTIVE'],
        );
        createdLocations += 1;
        return locationId;
      };

      await db.withTransactionAsync(async () => {
        for (let idx = 0; idx < params.rows.length; idx += 1) {
          const rowNo = idx + 2;
          const row = params.rows[idx];
          const locationCode = row.locationCode?.trim();
          const itemCode = row.itemCode?.trim();
          if (!locationCode) {
            invalidRows.push({ row: rowNo, itemCode, reason: 'Thiếu locationCode' });
            continue;
          }
          if (!itemCode) {
            invalidRows.push({ row: rowNo, locationCode, reason: 'Thiếu itemCode' });
            continue;
          }

          if (row.warehouseName && normalizeMetaValue(row.warehouseName) !== expectedWarehouseNorm) {
            invalidRows.push({
              row: rowNo,
              locationCode,
              itemCode,
              reason: 'Warehouse trong file không khớp kho đang làm việc',
            });
            continue;
          }

          if (row.snapshotId && normalizeMetaValue(row.snapshotId) !== expectedSnapshotNorm) {
            invalidRows.push({
              row: rowNo,
              locationCode,
              itemCode,
              reason: 'SnapshotId trong file không khớp phiên hiện tại',
            });
            continue;
          }

          if (row.sourceFileName && expectedSourceNorm) {
            const sourceNorm = normalizeMetaValue(stripFileExtension(row.sourceFileName));
            if (sourceNorm !== expectedSourceNorm) {
              invalidRows.push({
                row: rowNo,
                locationCode,
                itemCode,
                reason: 'Tên file nguồn không khớp snapshot hiện tại',
              });
              continue;
            }
          }

          if (row.snapshotDate && expectedSnapshotDate) {
            const inputDate = parseDateOnly(row.snapshotDate);
            if (!inputDate || inputDate !== expectedSnapshotDate) {
              invalidRows.push({
                row: rowNo,
                locationCode,
                itemCode,
                reason: 'Ngày dữ liệu không khớp snapshot đang dùng',
              });
              continue;
            }
          }

          const snapshotRow = await db.getFirstAsync<{ itemKey: string }>(
            `SELECT itemKey
             FROM snapshot_rows
             WHERE snapshotId = ? AND warehouseName = ? AND codeNorm = ?
             LIMIT 1`,
            [params.snapshotId, params.warehouseName, normKey(itemCode)],
          );
          if (!snapshotRow) {
            invalidRows.push({
              row: rowNo,
              locationCode,
              itemCode,
              reason: 'SKU không tồn tại trong snapshot hiện hành',
            });
            continue;
          }

          const locationId = await findOrCreateLocation(locationCode, row.locationName);
          if (!linkedLocations.has(locationId)) {
            const linked = await db.getFirstAsync<{ locationId: string }>(
              'SELECT locationId FROM location_counts WHERE sessionId = ? AND locationId = ?',
              [params.sessionId, locationId],
            );
            if (!linked) {
              await db.runAsync(
                `INSERT INTO location_counts (sessionId, locationId, status, progress, updatedAt)
                 VALUES (?, ?, ?, ?, ?)`,
                [params.sessionId, locationId, 'PENDING', JSON.stringify(DEFAULT_PROGRESS), now],
              );
            }
            linkedLocations.add(locationId);
          }

          const exists = await db.getFirstAsync<{ itemKey: string }>(
            `SELECT itemKey FROM location_scope_items
             WHERE sessionId = ? AND locationId = ? AND itemKey = ?`,
            [params.sessionId, locationId, snapshotRow.itemKey],
          );
          if (exists) {
            ignoredDuplicates += 1;
            continue;
          }

          await db.runAsync(
            `INSERT INTO location_scope_items (sessionId, locationId, itemKey, source, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [params.sessionId, locationId, snapshotRow.itemKey, 'mapping_import', now],
          );
          inserted += 1;
        }
      });

      const locationRows = await db.getAllAsync<{ locationId: string }>(
        'SELECT DISTINCT locationId FROM location_counts WHERE sessionId = ?',
        [params.sessionId],
      );
      for (const row of locationRows) {
        await recalcLocationProgress(db, params.sessionId, row.locationId);
      }

      return { inserted, ignoredDuplicates, createdLocations, invalidRows };
    },

    async listLocationScopeItems(params) {
      const db = await getDb();
      const rows = await db.getAllAsync<{
        sessionId: string;
        locationId: string;
        itemKey: string;
        source: 'mapping_import' | 'manual';
        createdAt: number;
      }>(
        params.locationId
          ? `SELECT sessionId, locationId, itemKey, source, createdAt
             FROM location_scope_items
             WHERE sessionId = ? AND locationId = ?
             ORDER BY createdAt DESC`
          : `SELECT sessionId, locationId, itemKey, source, createdAt
             FROM location_scope_items
             WHERE sessionId = ?
             ORDER BY createdAt DESC`,
        params.locationId ? [params.sessionId, params.locationId] : [params.sessionId],
      );
      return rows;
    },

    async replaceLocationScope(params) {
      const db = await getDb();
      const source = params.source ?? 'manual';
      const now = Date.now();
      const uniqueKeys = Array.from(new Set(params.itemKeys.map((k) => k.trim()).filter(Boolean)));

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'DELETE FROM location_scope_items WHERE sessionId = ? AND locationId = ?',
          [params.sessionId, params.locationId],
        );
        for (const itemKey of uniqueKeys) {
          await db.runAsync(
            `INSERT INTO location_scope_items (sessionId, locationId, itemKey, source, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [params.sessionId, params.locationId, itemKey, source, now],
          );
        }
      });

      await recalcLocationProgress(db, params.sessionId, params.locationId);
      return { inserted: uniqueKeys.length };
    },

    async upsertLocationScopeItem(params) {
      const db = await getDb();
      const now = Date.now();
      await db.runAsync(
        `INSERT OR REPLACE INTO location_scope_items (sessionId, locationId, itemKey, source, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [params.sessionId, params.locationId, params.itemKey, params.source ?? 'manual', now],
      );
      await recalcLocationProgress(db, params.sessionId, params.locationId);
    },

    async getLocationScopeStats(sessionId: string) {
      const db = await getDb();
      const mapped = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(DISTINCT itemKey) AS n FROM location_scope_items WHERE sessionId = ?',
        [sessionId],
      );
      const outOfScope = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) AS n FROM count_lines WHERE sessionId = ? AND isOutOfScope = 1',
        [sessionId],
      );
      return {
        mappedSessionSku: mapped?.n ?? 0,
        outOfScopeLines: outOfScope?.n ?? 0,
      };
    },

    async hasLocationCountData(params) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) AS n FROM count_lines WHERE sessionId = ? AND locationId = ?',
        [params.sessionId, params.locationId],
      );
      return (row?.n ?? 0) > 0;
    },

    async getSessionMeta(sessionId: string) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ sessionId: string; snapshotId: string; warehouseName: string; createdAt: number }>(
        'SELECT id AS sessionId, snapshotId, warehouseName, createdAt FROM sessions WHERE id = ? LIMIT 1',
        [sessionId],
      );
      return row ?? undefined;
    },

    async getLocationMeta(params) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ locationId: string; locationCode: string; locationName: string }>(
        `SELECT l.id AS locationId, l.code AS locationCode, l.displayName AS locationName
         FROM location_counts lc
         JOIN locations l ON l.id = lc.locationId
         WHERE lc.sessionId = ? AND lc.locationId = ?
         LIMIT 1`,
        [params.sessionId, params.locationId],
      );
      return row ?? undefined;
    },

    async buildLocationPackage(params) {
      const db = await getDb();
      const session = await db.getFirstAsync<{ snapshotId: string; warehouseName: string; createdAt: number }>(
        'SELECT snapshotId, warehouseName, createdAt FROM sessions WHERE id = ? LIMIT 1',
        [params.sessionId],
      );
      if (!session) {
        throw new Error('Không tìm thấy phiên kiểm kê.');
      }

      const snapshotMeta = await db.getFirstAsync<{ sourceFileName: string; snapshotAt: number }>(
        'SELECT sourceFileName, snapshotAt FROM snapshots WHERE id = ? LIMIT 1',
        [session.snapshotId],
      );
      if (!snapshotMeta) {
        throw new Error('Không tìm thấy dữ liệu snapshot nguồn.');
      }

      const location = await db.getFirstAsync<{ locationCode: string; locationName: string }>(
        `SELECT l.code AS locationCode, l.displayName AS locationName
         FROM location_counts lc
         JOIN locations l ON l.id = lc.locationId
         WHERE lc.sessionId = ? AND lc.locationId = ?
         LIMIT 1`,
        [params.sessionId, params.locationId],
      );
      if (!location) {
        throw new Error('Vị trí không thuộc phiên hiện tại.');
      }

      const scopeCountRow = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) AS n FROM location_scope_items WHERE sessionId = ? AND locationId = ?',
        [params.sessionId, params.locationId],
      );
      const hasScope = (scopeCountRow?.n ?? 0) > 0;

      const items = hasScope
        ? await db.getAllAsync<{ itemCode: string; itemName: string; uom: string; onHandQty: number }>(
            `SELECT s.itemCode, s.itemName, s.uom, s.onHandQty
             FROM location_scope_items lsi
             JOIN snapshot_rows s ON s.itemKey = lsi.itemKey
             WHERE lsi.sessionId = ? AND lsi.locationId = ? AND s.snapshotId = ? AND s.warehouseName = ?
             ORDER BY s.itemName ASC, s.itemCode ASC`,
            [params.sessionId, params.locationId, session.snapshotId, session.warehouseName],
          )
        : await db.getAllAsync<{ itemCode: string; itemName: string; uom: string; onHandQty: number }>(
            `SELECT itemCode, itemName, uom, onHandQty
             FROM snapshot_rows
             WHERE snapshotId = ? AND warehouseName = ?
             ORDER BY itemName ASC, itemCode ASC`,
            [session.snapshotId, session.warehouseName],
          );

      const snapshotDate = new Date(snapshotMeta.snapshotAt).toISOString().slice(0, 10);
      return {
        meta: {
          dataCycleCode: params.dataCycleCode,
          snapshotId: session.snapshotId,
          sourceFileName: snapshotMeta.sourceFileName,
          warehouseName: session.warehouseName,
          locationCode: location.locationCode,
          locationName: location.locationName,
          snapshotDate,
        },
        items,
      };
    },

    async setSessionExchangeMeta(params) {
      const db = await getDb();
      await db.runAsync(
        `INSERT OR REPLACE INTO session_exchange_meta
         (sessionId, dataCycleCode, sourceSnapshotId, sourceFileName, snapshotDate, warehouseName, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          params.sessionId,
          params.dataCycleCode,
          params.sourceSnapshotId,
          params.sourceFileName,
          params.snapshotDate,
          params.warehouseName,
          Date.now(),
        ],
      );
    },

    async getSessionExchangeMeta(sessionId: string) {
      const db = await getDb();
      const row = await db.getFirstAsync<{
        sessionId: string;
        dataCycleCode: string;
        sourceSnapshotId: string;
        sourceFileName: string;
        snapshotDate: string;
        warehouseName: string;
      }>(
        `SELECT sessionId, dataCycleCode, sourceSnapshotId, sourceFileName, snapshotDate, warehouseName
         FROM session_exchange_meta
         WHERE sessionId = ?
         LIMIT 1`,
        [sessionId],
      );
      return row ?? undefined;
    },

    async importLocationSubmission(params) {
      const db = await getDb();
      if (params.meta.snapshotId !== params.expectedSnapshotId) {
        throw new Error('Mã snapshot nguồn trong file nộp không khớp phiên hiện tại.');
      }
      if (normKey(params.meta.warehouseName) !== normKey(params.expectedWarehouseName)) {
        throw new Error('Tên kho trong file nộp không khớp kho đang làm việc.');
      }
      const exchangeMeta = await db.getFirstAsync<{ dataCycleCode: string; sourceSnapshotId: string }>(
        'SELECT dataCycleCode, sourceSnapshotId FROM session_exchange_meta WHERE sessionId = ? LIMIT 1',
        [params.sessionId],
      );
      if (exchangeMeta && normKey(exchangeMeta.dataCycleCode) !== normKey(params.meta.dataCycleCode)) {
        throw new Error('Mã kỳ dữ liệu trong file nộp không khớp phiên hiện tại.');
      }
      if (exchangeMeta && exchangeMeta.sourceSnapshotId !== params.meta.snapshotId) {
        throw new Error('Mã snapshot nguồn trong file nộp không khớp kỳ dữ liệu đang mở.');
      }

      const now = Date.now();
      let locationId = '';
      const existingLocation = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM locations WHERE code = ? LIMIT 1',
        [params.meta.locationCode],
      );
      if (existingLocation) {
        locationId = existingLocation.id;
      } else {
        locationId = newId('loc');
        await db.runAsync(
          'INSERT INTO locations (id, code, displayName, type, status) VALUES (?, ?, ?, ?, ?)',
          [locationId, params.meta.locationCode, params.meta.locationName || params.meta.locationCode, 'OTHER', 'ACTIVE'],
        );
      }

      const linked = await db.getFirstAsync<{ locationId: string }>(
        'SELECT locationId FROM location_counts WHERE sessionId = ? AND locationId = ?',
        [params.sessionId, locationId],
      );
      if (!linked) {
        await db.runAsync(
          `INSERT INTO location_counts (sessionId, locationId, status, progress, updatedAt)
           VALUES (?, ?, ?, ?, ?)`,
          [params.sessionId, locationId, 'PENDING', JSON.stringify(DEFAULT_PROGRESS), now],
        );
      }

      const existedData = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) AS n FROM count_lines WHERE sessionId = ? AND locationId = ?',
        [params.sessionId, locationId],
      );
      if ((existedData?.n ?? 0) > 0) {
        throw new Error(
          `Vị trí ${params.meta.locationCode} đã có dữ liệu kiểm. Hãy đổi mã vị trí trên file hoặc hủy thao tác nạp.`,
        );
      }

      const seen = new Set<string>();
      const invalid: string[] = [];
      const prepared: Array<{
        itemKey: string;
        countTotal: number;
        countUsable: number;
        outOfScope: boolean;
        updatedAt: number;
      }> = [];

      for (const row of params.rows) {
        const itemCode = (row.itemCode || '').trim();
        if (!itemCode) continue;
        const itemCodeNorm = normKey(itemCode);
        if (seen.has(itemCodeNorm)) {
          invalid.push(`Trùng mã hàng trong file nộp: ${itemCode}`);
          continue;
        }
        seen.add(itemCodeNorm);

        const snapshotRow = await db.getFirstAsync<{ itemKey: string }>(
          `SELECT itemKey FROM snapshot_rows
           WHERE snapshotId = ? AND warehouseName = ? AND codeNorm = ?
           LIMIT 1`,
          [params.expectedSnapshotId, params.expectedWarehouseName, itemCodeNorm],
        );
        if (!snapshotRow) {
          invalid.push(`Mã hàng không tồn tại trong dữ liệu nguồn: ${itemCode}`);
          continue;
        }

        const countTotal = Math.max(0, Number(row.countTotal || 0));
        const countUsableRaw = Math.max(0, Number(row.countUsable || 0));
        const countUsable = Math.min(countUsableRaw, countTotal);
        prepared.push({
          itemKey: snapshotRow.itemKey,
          countTotal,
          countUsable,
          outOfScope: !!row.outOfScope,
          updatedAt: row.updatedAt || now,
        });
      }

      if (invalid.length > 0) {
        throw new Error(invalid.slice(0, 3).join('\n'));
      }

      await db.withTransactionAsync(async () => {
        if (!exchangeMeta) {
          await db.runAsync(
            `INSERT OR REPLACE INTO session_exchange_meta
             (sessionId, dataCycleCode, sourceSnapshotId, sourceFileName, snapshotDate, warehouseName, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              params.sessionId,
              params.meta.dataCycleCode,
              params.meta.snapshotId,
              params.meta.sourceFileName,
              params.meta.snapshotDate || new Date().toISOString().slice(0, 10),
              params.meta.warehouseName,
              now,
            ],
          );
        }
        for (const row of prepared) {
          const badQty = Math.max(row.countTotal - row.countUsable, 0);
          const exceptions =
            badQty > 0
              ? JSON.stringify([{ reason: 'OTHER', qty: badQty, note: 'Nạp từ file nộp vị trí' }])
              : JSON.stringify([]);
          await db.runAsync(
            `INSERT OR REPLACE INTO count_lines
             (sessionId, locationId, itemKey, countTotal, countUsable, exceptions, isOutOfScope, state, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              params.sessionId,
              locationId,
              row.itemKey,
              row.countTotal,
              row.countUsable,
              exceptions,
              row.outOfScope ? 1 : 0,
              'COUNTED',
              row.updatedAt,
            ],
          );
        }

        await db.runAsync(
          `INSERT INTO submission_import_logs
           (id, sessionId, locationId, fileName, fileChecksum, importedAt, rows, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId('subimp'),
            params.sessionId,
            locationId,
            `NOP_VI_TRI_${params.meta.dataCycleCode}_${params.meta.locationCode}`,
            '',
            now,
            prepared.length,
            'IMPORTED',
          ],
        );
      });

      await recalcLocationProgress(db, params.sessionId, locationId);
      return {
        importedRows: prepared.length,
        locationId,
        locationCode: params.meta.locationCode,
      };
    },
  };
}
