import { MisaImportRow, SnapshotId, ImportResult, ImportConflict } from '@/domain/entities/types';
import { normKey } from '@/domain/utils/normalize';
import { SnapshotWriteRepo } from '@/domain/usecases/ports';

export async function importMisaSnapshot(params: {
  rows: MisaImportRow[];
  sourceFileName: string;
  repo: SnapshotWriteRepo;
  resolutions?: Map<string, 'use_rowA' | 'use_rowB'>;
}): Promise<ImportResult> {
  const conflicts: ImportConflict[] = [];
  
  // Map Key -> Row. Start with empty map.
  const map = new Map<string, MisaImportRow>();
  
  for (const r of params.rows) {
    const key = `${r.warehouseName}__${r.itemCode}`;
    
    if (map.has(key)) {
      const rowA = map.get(key)!;
      const rowB = r;

      // 1. Check name similarity
      const n1 = normKey(rowA.itemName);
      const n2 = normKey(rowB.itemName);

      if (n1 !== n2) {
        // Conflict detected!
        // Check if user has already resolved this
        const resolution = params.resolutions?.get(key);

        if (resolution === 'use_rowA') {
          // Keep rowA, ignore rowB
          continue;
        } else if (resolution === 'use_rowB') {
          // Overwrite with rowB
          map.set(key, rowB);
          continue;
        } else {
          // No resolution yet -> Record conflict
          // Only add if not already in conflicts list (simplified: assume sequential scan)
          conflicts.push({
            itemCode: r.itemCode,
            warehouseName: r.warehouseName,
            rowA,
            rowB,
          });
          // We keep rowA in map for now until resolved
          continue;
        }
      }
      
      // If names are same, just overwrite (last wins) or keep first. 
      // Let's stick to "Last wins" for standard duplicates
      map.set(key, r);
    } else {
      map.set(key, r);
    }
  }

  // If there are unresolved conflicts, stop and return them
  if (conflicts.length > 0) {
    return { success: false, conflicts };
  }

  // No conflicts, proceed to save
  const snapshotAt = Date.now();
  const snapshotId = await params.repo.createSnapshot({
    sourceFileName: params.sourceFileName,
    snapshotAt,
  });

  const upsertRows = Array.from(map.values()).map((r) => ({
    warehouseName: r.warehouseName,
    itemCode: r.itemCode,
    itemName: r.itemName,
    uom: r.uom,
    onHandQty: r.onHandQty,
    codeNorm: normKey(r.itemCode),
    nameNorm: normKey(r.itemName),
  }));

  await params.repo.upsertSnapshotRows({ snapshotId, rows: upsertRows });
  const warehouses = await params.repo.listWarehouses({ snapshotId });
  
  return { success: true, snapshotId, warehouses };
}
