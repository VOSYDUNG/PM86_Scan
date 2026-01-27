import { snapshotRepoSqlite } from '@/data/repos/snapshotRepoSqlite';
import { barcodeAliasRepoSqlite } from '@/data/repos/barcodeAliasRepoSqlite';
import { actualRepoSqlite } from '@/data/repos/actualRepoSqlite';
import { sessionRepoSqlite } from '@/data/repos/sessionRepoSqlite';
import { exportRepoSqlite } from '@/data/repos/exportRepoSqlite';
import { countRepoSqlite } from '@/data/repos/countRepoSqlite';

export const repos = {
  snapshot: snapshotRepoSqlite(),
  barcodeAlias: barcodeAliasRepoSqlite(),
  actual: actualRepoSqlite(),
  session: sessionRepoSqlite(),
  export: exportRepoSqlite(),
  count: countRepoSqlite(),
};
