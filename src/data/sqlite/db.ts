import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('pm86_stockcount.db');
      await initSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  // WAL makes local writes faster and safer
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // --- MIGRATION LOGIC ---
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;
  const TARGET_VERSION = 2; // Bump this when schema changes

  if (currentVersion < TARGET_VERSION) {
    console.log(`Migrating DB from v${currentVersion} to v${TARGET_VERSION}...`);
    // Drop tables that changed structure in P1
    await db.execAsync(`
      DROP TABLE IF EXISTS count_lines;
      DROP TABLE IF EXISTS location_counts;
    `);
    // Update version
    await db.execAsync(`PRAGMA user_version = ${TARGET_VERSION}`);
  }
  // -----------------------

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      snapshotAt INTEGER NOT NULL,
      sourceFileName TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snapshot_rows (
      snapshotId TEXT NOT NULL,
      warehouseName TEXT NOT NULL,
      itemKey TEXT NOT NULL,
      itemCode TEXT NOT NULL,
      itemName TEXT NOT NULL,
      uom TEXT NOT NULL,
      onHandQty REAL NOT NULL,
      nameNorm TEXT NOT NULL,
      codeNorm TEXT NOT NULL,
      PRIMARY KEY (snapshotId, warehouseName, itemKey)
    );

    CREATE INDEX IF NOT EXISTS idx_snapshot_rows_code
      ON snapshot_rows (snapshotId, warehouseName, codeNorm);

    CREATE INDEX IF NOT EXISTS idx_snapshot_rows_name
      ON snapshot_rows (snapshotId, warehouseName, nameNorm);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      snapshotId TEXT NOT NULL,
      warehouseName TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_snap_wh
      ON sessions (snapshotId, warehouseName, createdAt);

    CREATE TABLE IF NOT EXISTS actual_rows (
      sessionId TEXT NOT NULL,
      itemKey TEXT NOT NULL,
      actualQty REAL NOT NULL,
      diffQty REAL NOT NULL,
      reasonCode TEXT,
      reasonText TEXT,
      note TEXT,
      updatedAt INTEGER NOT NULL,
      PRIMARY KEY (sessionId, itemKey)
    );

    CREATE INDEX IF NOT EXISTS idx_actual_session
      ON actual_rows (sessionId, updatedAt);

    CREATE TABLE IF NOT EXISTS barcode_alias (
      barcode TEXT PRIMARY KEY NOT NULL,
      itemKey TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );

    -- NEW TABLES FOR MULTI-LOCATION (Plan Section 2.1) --

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL,
      displayName TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      meta TEXT -- JSON
    );

    CREATE TABLE IF NOT EXISTS location_counts (
      sessionId TEXT NOT NULL,
      locationId TEXT NOT NULL,
      status TEXT NOT NULL, -- PENDING | IN_PROGRESS | DONE | LOCKED
      progress TEXT,        -- JSON { expected, counted... }
      updatedAt INTEGER NOT NULL,
      PRIMARY KEY (sessionId, locationId)
    );

    CREATE TABLE IF NOT EXISTS count_lines (
      sessionId TEXT NOT NULL,
      locationId TEXT NOT NULL,
      itemKey TEXT NOT NULL,
      
      systemQty REAL NOT NULL DEFAULT 0,
      countTotal REAL NOT NULL DEFAULT 0,
      exceptions TEXT, -- JSON array of { reason, qty, note }
      
      countUsable REAL NOT NULL DEFAULT 0, -- Computed
      state TEXT NOT NULL, -- UNCOUNTED | COUNTED | NEED_RECOUNT
      
      updatedAt INTEGER NOT NULL,
      updatedBy TEXT,
      PRIMARY KEY (sessionId, locationId, itemKey)
    );

    CREATE INDEX IF NOT EXISTS idx_count_lines_session
      ON count_lines (sessionId, locationId);
  `);
}

export async function resetDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS count_lines;
    DROP TABLE IF EXISTS location_counts;
    DROP TABLE IF EXISTS locations;
    DROP TABLE IF EXISTS barcode_alias;
    DROP TABLE IF EXISTS actual_rows;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS snapshot_rows;
    DROP TABLE IF EXISTS snapshots;
    PRAGMA foreign_keys = ON;
  `);
  await initSchema(db);
}
