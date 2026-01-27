import { CountRepo, SnapshotRepo, CountSessionRepo } from './ports';
import { 
  SnapshotId, SessionId, ItemKey, 
  CoverageStatus, ReconciliationHint, QualityCode 
} from '@/domain/entities/types';

export type ProductAnalysis = {
  itemKey: string;
  itemCode: string;
  itemName: string;
  
  systemQty: number; // Global Snapshot Qty
  
  totalCounted: number;
  totalUsable: number;
  
  breakdown: {
    [key in QualityCode]?: number;
  };
  
  locations: Array<{
    locationId: string;
    locationName: string; // Need to fetch or map
    qty: number;
    diff: number; // vs allocated system qty (complex if system qty is not allocated per loc)
  }>;
  
  coverage: CoverageStatus;
  hints: ReconciliationHint[];
};

export async function analyzeProduct(params: {
  sessionId: SessionId;
  snapshotId: SnapshotId;
  warehouseName: string;
  itemKey: ItemKey;
  repos: {
    snapshot: SnapshotRepo;
    count: CountRepo;
    session: CountSessionRepo;
  };
}): Promise<ProductAnalysis> {
  const { sessionId, snapshotId, warehouseName, itemKey, repos } = params;

  // 1. Get Snapshot Info
  const snapRow = await repos.snapshot.getRowByItemKey({ snapshotId, warehouseName, itemKey });
  if (!snapRow) {
    throw new Error('Item not found in snapshot');
  }

  // 2. Get All Counts
  const lines = await repos.count.findAllCountLinesForItem({ sessionId, itemKey });
  
  // 3. Aggregate
  let totalCounted = 0;
  let totalUsable = 0;
  const breakdown: Record<string, number> = {};
  
  // Also need location names. Ideally we cache or join, but for now fetch all locs of session
  const allLocs = await repos.session.listLocationCounts(sessionId);
  const locMap = new Map(allLocs.map(l => [l.locationId, l.locationName]));

  const locationDetails = lines.map(line => {
    totalCounted += line.countTotal;
    totalUsable += line.countUsable;
    
    // Sum exceptions
    line.exceptions.forEach((ex: { reason: string; qty: number }) => {
      breakdown[ex.reason] = (breakdown[ex.reason] || 0) + ex.qty;
    });

    return {
      locationId: line.locationId,
      locationName: locMap.get(line.locationId) || 'Unknown Loc',
      qty: line.countUsable, // Usually we compare Usable vs System
      diff: 0 // Cannot calc accurate per-location diff without per-location snapshot
    };
  });

  // 4. Hints & Coverage
  const hints: ReconciliationHint[] = [];
  
  // Quality Hint
  if (Object.keys(breakdown).some(k => k !== 'GOOD' && k !== 'OTHER')) {
    hints.push('QUALITY_EXCEPTION');
  }
  
  // Mislocation Hint (Heuristic: If total diff is small but variance across locations exists)
  // Since we don't have per-location system qty input yet (MISA file is global per warehouse),
  // we can only detect if item appears in multiple locations unexpectedly.
  if (lines.length > 1) {
    hints.push('MISLOCATION'); // Just a hint that it's scattered
  }

  // Coverage
  // Simple logic: If counted > 0, assume Partial. If matches system, Complete?
  // Real logic needs "Scope". For now:
  let coverage: CoverageStatus = 'NOT_STARTED';
  if (lines.length > 0) coverage = 'PARTIAL';
  
  // If we matched the system quantity exactly (or close), mark Complete
  if (Math.abs(totalUsable - snapRow.onHandQty) < 0.001 && totalUsable > 0) {
    coverage = 'COMPLETE';
  }

  return {
    itemKey,
    itemCode: snapRow.itemCode,
    itemName: snapRow.itemName,
    systemQty: snapRow.onHandQty,
    totalCounted,
    totalUsable,
    breakdown,
    locations: locationDetails,
    coverage,
    hints
  };
}
