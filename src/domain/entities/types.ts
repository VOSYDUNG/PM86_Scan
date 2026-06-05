export type SnapshotId = string;
export type SessionId = string;
export type ItemKey = string; // itemCode or generatedCode
export type LocationId = string;

// --- LEGACY / SINGLE LOCATION TYPES (Keeping for backward compat during migration) ---
export type ReasonCode =
  | 'WRONG_LABEL'
  | 'EXPIRED'
  | 'LOSS'
  | 'OVER'
  | 'DAMAGED'
  | 'OTHER';

export type MisaImportRow = {
  warehouseName: string;
  itemCode: string;
  itemName: string;
  uom: string;
  onHandQty: number;
};

export interface ImportConflict {
  itemCode: string;
  warehouseName: string;
  rowA: MisaImportRow; // The first occurrence
  rowB: MisaImportRow; // The new occurrence
}

export type ImportResult =
  | { success: true; snapshotId: SnapshotId; warehouses: string[] }
  | { success: false; conflicts: ImportConflict[] };

export type Snapshot = {
  id: SnapshotId;
  snapshotAt: number;
  sourceFileName: string;
};

export type SnapshotRow = MisaImportRow & {
  snapshotId: SnapshotId;
  nameNorm: string;
  codeNorm: string;
};

export type CountSession = {
  id: SessionId;
  snapshotId: SnapshotId;
  warehouseName: string;
  createdAt: number;
  // New fields for Multi-Location
  title?: string;
  modeDefault?: 'ADD' | 'SET';
  locationsInScope?: LocationId[];
  status?: 'DRAFT' | 'IN_PROGRESS' | 'CLOSED' | 'EXPORTED';
};

export type ActualRow = {
  sessionId: SessionId;
  itemKey: ItemKey;
  actualQty: number;
  diffQty: number;
  reasonCode?: ReasonCode;
  reasonText?: string;
  note?: string;
  updatedAt: number;
};

// --- NEW MULTI-LOCATION CORE ENTITIES (Plan Section 2.1 & 4) ---

// 1. Location Structure
export type LocationType = 'WAREHOUSE' | 'VEHICLE' | 'QUARANTINE' | 'OTHER';
export type LocationStatus = 'ACTIVE' | 'INACTIVE';

export type Location = {
  id: LocationId;
  code: string;       // Unique code (e.g., WH_MAIN, VEH_29A)
  displayName: string;
  type: LocationType;
  status: LocationStatus;
  meta?: Record<string, any>; // driver, plate number, etc.
};

// 2. Sub-session per Location
export type LocationCountStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'LOCKED';

export type LocationCount = {
  sessionId: SessionId;
  locationId: LocationId;
  status: LocationCountStatus;
  progress: {
    expectedLines: number; // Based on snapshot for this location (if available)
    countedLines: number;
    uncountedLines: number;
    outOfScopeCount: number;
  };
  updatedAt: number;
};

export type LocationScopeSource = 'mapping_import' | 'manual';

export type LocationScopeItem = {
  sessionId: SessionId;
  locationId: LocationId;
  itemKey: ItemKey;
  source: LocationScopeSource;
  createdAt: number;
};

export type LocationScopeImportError = {
  row: number;
  locationCode?: string;
  itemCode?: string;
  reason: string;
};

export type LocationScopeImportResult = {
  inserted: number;
  ignoredDuplicates: number;
  createdLocations: number;
  invalidRows: LocationScopeImportError[];
};

export type LocationExchangeMeta = {
  dataCycleCode: string;
  snapshotId: string;
  sourceFileName: string;
  warehouseName: string;
  locationCode: string;
  locationName: string;
  snapshotDate: string;
};

export type LocationPackageItem = {
  itemCode: string;
  itemName: string;
  uom: string;
  onHandQty: number;
};

export type LocationSubmissionRow = {
  itemCode: string;
  countTotal: number;
  countUsable: number;
  outOfScope: boolean;
  updatedAt: number;
};

export type LocationSubmissionImportResult = {
  importedRows: number;
  locationId: string;
  locationCode: string;
};

// 3. Quality Buckets (Plan Section 4.5)
export type QualityCode =
  | 'GOOD'            // Implicit
  | 'EXPIRED'
  | 'DAMAGED'
  | 'WRONG_CODE'      // Label mismatch
  | 'WRONG_SIZE_PACK' // Wrong packaging/UOM
  | 'LOW_QUALITY'
  | 'OTHER';

export type CountException = {
  reason: QualityCode;
  qty: number;
  note?: string;
  evidence?: string; // path to image
};

// 4. Count Line (The Source of Truth per Location)
export type CountLineState = 'UNCOUNTED' | 'COUNTED' | 'NEED_RECOUNT' | 'QUARANTINE';

export type CountLine = {
  sessionId: SessionId;
  locationId: LocationId;
  itemKey: ItemKey;
  
  systemQty: number; // Snapshot qty allocated to this location (usually 0 if blind or warehouse general)
  
  countTotal: number; // Physical count
  exceptions: CountException[]; // Breakdown of bad items
  
  // Computed:
  countUsable: number; // countTotal - sum(exceptions)
  diff: number;        // countUsable - systemQty
  
  state: CountLineState;
  
  updatedAt: number;
  updatedBy?: string;
};

// 5. Aggregates & Hints (Plan Section 2.2 & 2.3)
export type CoverageStatus = 'NOT_STARTED' | 'PARTIAL' | 'COMPLETE';

export type ReconciliationHint = 
  | 'INCOMPLETE_COVERAGE'
  | 'MISLOCATION'
  | 'IN_TRANSIT_VEHICLE'
  | 'QUALITY_EXCEPTION'
  | 'TRANSACTION_TIMING';

// --- HELPERS ---

export type ResolveInput = {
  snapshotId: SnapshotId;
  warehouseName: string;
  query: string;
};

export type Candidate = {
  itemKey: ItemKey;
  itemCode: string;
  itemName: string;
  uom: string;
  onHandQty: number;
  score: number;
};

export type ResolveResult =
  | { type: 'single'; itemKey: ItemKey; source: 'alias' | 'code' | 'score' }
  | { type: 'suggest'; candidates: Candidate[] }
  | { type: 'unknown' };

export const REASON_LABEL_VI: Record<Exclude<ReasonCode, 'OTHER'>, string> = {
  WRONG_LABEL: 'Hàng lộn mã',
  EXPIRED: 'Hàng hết hạn',
  LOSS: 'Hàng thất thoát',
  OVER: 'Hàng thừa',
  DAMAGED: 'Hàng hư hỏng',
};

export const QUALITY_LABEL_VI: Record<QualityCode, string> = {
  GOOD: 'Hàng tốt (Usable)',
  EXPIRED: 'Hết hạn sử dụng',
  DAMAGED: 'Hư hỏng/Móp méo',
  WRONG_CODE: 'Sai mã/Tem nhãn',
  WRONG_SIZE_PACK: 'Sai quy cách/Size',
  LOW_QUALITY: 'Phẩm chất kém',
  OTHER: 'Khác',
};

export const QUALITY_LABEL_KEY: Record<QualityCode, string> = {
  GOOD: 'quality.good',
  EXPIRED: 'quality.expired',
  DAMAGED: 'quality.damaged',
  WRONG_CODE: 'quality.wrongCode',
  WRONG_SIZE_PACK: 'quality.wrongSizePack',
  LOW_QUALITY: 'quality.lowQuality',
  OTHER: 'quality.other',
};
