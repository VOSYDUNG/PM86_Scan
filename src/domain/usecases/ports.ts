import {
  Candidate,
  CountException,
  ItemKey,
  LocationExchangeMeta,
  LocationPackageItem,
  LocationSubmissionImportResult,
  LocationSubmissionRow,
  LocationScopeImportResult,
  LocationScopeItem,
  LocationScopeSource,
  SnapshotId,
} from '@/domain/entities/types';

export interface BarcodeAliasRepo {
  getItemKeyByBarcode(barcode: string): Promise<ItemKey | undefined>;
  upsertAlias?(params: { barcode: string; itemKey: ItemKey; createdAt: number }): Promise<void>;
}

export interface SnapshotRepo {
  hasSnapshot(snapshotId: SnapshotId): Promise<boolean>;
  getRowByItemCode(params: {
    snapshotId: SnapshotId;
    warehouseName: string;
    itemCode: string;
    codeNorm: string;
  }): Promise<
    | {
        itemKey: ItemKey;
        itemCode: string;
        itemName: string;
        uom: string;
        onHandQty: number;
      }
    | undefined
  >;

  getRowByItemKey(params: {
    snapshotId: SnapshotId;
    warehouseName: string;
    itemKey: ItemKey;
  }): Promise<
    | {
        itemKey: ItemKey;
        itemCode: string;
        itemName: string;
        uom: string;
        onHandQty: number;
      }
    | undefined
  >;

  searchRows(params: {
    snapshotId: SnapshotId;
    warehouseName: string;
    queryNorm: string;
    limit: number;
  }): Promise<
    Array<{
      itemKey: ItemKey;
      itemCode: string;
      itemName: string;
      uom: string;
      onHandQty: number;
      nameNorm: string;
      codeNorm: string;
    }>
  >;

  getAllSnapshots(): Promise<Array<{ id: string; snapshotAt: number; sourceFileName: string }>>;
  getSnapshotMeta(snapshotId: string): Promise<{ id: string; snapshotAt: number; sourceFileName: string } | undefined>;
  deleteSnapshot(snapshotId: string): Promise<void>;
  renameSnapshot(snapshotId: string, sourceFileName: string): Promise<void>;
  countSnapshotRows(params: { snapshotId: SnapshotId; warehouseName: string }): Promise<number>;
}

export interface SnapshotWriteRepo {
  createSnapshot(params: { sourceFileName: string; snapshotAt: number }): Promise<SnapshotId>;
  upsertSnapshotRows(params: {
    snapshotId: SnapshotId;
    rows: Array<{
      warehouseName: string;
      itemCode: string;
      itemName: string;
      uom: string;
      onHandQty: number;
      nameNorm: string;
      codeNorm: string;
    }>;
  }): Promise<void>;
  bulkUpsertSnapshot(params: {
    snapshotId: SnapshotId;
    rows: Array<{
      warehouseName: string;
      itemCode: string;
      itemName: string;
      uom: string;
      onHandQty: number;
      nameNorm: string;
      codeNorm: string;
    }>;
    options?: { batchSize?: number };
  }): Promise<void>;
  insertSingleSnapshotRow(params: {
    snapshotId: SnapshotId;
    warehouseName: string;
    itemCode: string;
    itemName: string;
    uom: string;
    onHandQty: number;
    nameNorm: string;
    codeNorm: string;
  }): Promise<void>;
  listWarehouses(params: { snapshotId: SnapshotId }): Promise<string[]>;
}

export interface ActualRepo {
  upsertActual(params: {
    sessionId: string;
    itemKey: string;
    actualQty: number;
    diffQty: number;
    reasonCode?: string;
    reasonText?: string;
    note?: string;
    updatedAt: number;
  }): Promise<void>;

  getActual(params: { sessionId: string; itemKey: string }): Promise<
    | {
        actualQty: number;
        diffQty: number;
      }
    | undefined
  >;
}

export interface CountSessionRepo {
  createSession(params: { snapshotId: SnapshotId; warehouseName: string }): Promise<string>;
  deleteSession(sessionId: string): Promise<void>;
  listSessions(params: {
    snapshotId: SnapshotId;
    warehouseName: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<{ id: string; createdAt: number }>>;
  countSessions(params: { snapshotId: SnapshotId; warehouseName: string }): Promise<number>;
  
  listLocationCounts(sessionId: string): Promise<
    Array<{
      sessionId: string;
      locationId: string;
      status: string; // LocationCountStatus
      progress: {
        expectedLines: number;
        countedLines: number;
        uncountedLines: number;
        outOfScopeCount: number;
      };
      updatedAt: number;
      // Joined fields
      locationCode: string;
      locationName: string;
      locationType: string;
    }>
  >;

  ensureLocationInSession(params: {
    sessionId: string;
    locationCode: string;
    locationName?: string; // Optional if creating new
    locationType?: string; // Optional
  }): Promise<string>; // Returns locationId

  updateLocationName(params: { locationId: string; locationName: string }): Promise<void>;

  removeLocationFromSession(params: { sessionId: string; locationId: string }): Promise<void>;

  importLocationScope(params: {
    sessionId: string;
    snapshotId: SnapshotId;
    warehouseName: string;
    rows: Array<{
      locationCode: string;
      locationName?: string;
      itemCode: string;
      itemName?: string;
      uom?: string;
      warehouseName?: string;
      snapshotId?: string;
      sourceFileName?: string;
      snapshotDate?: string;
      note?: string;
    }>;
  }): Promise<LocationScopeImportResult>;

  listLocationScopeItems(params: { sessionId: string; locationId?: string }): Promise<LocationScopeItem[]>;

  replaceLocationScope(params: {
    sessionId: string;
    locationId: string;
    itemKeys: string[];
    source?: LocationScopeSource;
  }): Promise<{ inserted: number }>;

  upsertLocationScopeItem(params: {
    sessionId: string;
    locationId: string;
    itemKey: string;
    source?: LocationScopeSource;
  }): Promise<void>;

  getLocationScopeStats(sessionId: string): Promise<{ mappedSessionSku: number; outOfScopeLines: number }>;
  hasLocationCountData(params: { sessionId: string; locationId: string }): Promise<boolean>;
  getSessionMeta(sessionId: string): Promise<{ sessionId: string; snapshotId: string; warehouseName: string; createdAt: number } | undefined>;
  getLocationMeta(params: { sessionId: string; locationId: string }): Promise<{ locationId: string; locationCode: string; locationName: string } | undefined>;
  buildLocationPackage(params: { sessionId: string; locationId: string; dataCycleCode: string }): Promise<{ meta: LocationExchangeMeta; items: LocationPackageItem[] }>;
  setSessionExchangeMeta(params: {
    sessionId: string;
    dataCycleCode: string;
    sourceSnapshotId: string;
    sourceFileName: string;
    snapshotDate: string;
    warehouseName: string;
  }): Promise<void>;
  getSessionExchangeMeta(sessionId: string): Promise<{
    sessionId: string;
    dataCycleCode: string;
    sourceSnapshotId: string;
    sourceFileName: string;
    snapshotDate: string;
    warehouseName: string;
  } | undefined>;
  importLocationSubmission(params: {
    sessionId: string;
    expectedSnapshotId: string;
    expectedWarehouseName: string;
    meta: LocationExchangeMeta;
    rows: LocationSubmissionRow[];
  }): Promise<LocationSubmissionImportResult>;
}

export interface CountRepo {
  getCountLine(params: {
    sessionId: string;
    locationId: string;
    itemKey: string;
  }): Promise<{
    countTotal: number;
    exceptions: CountException[];
    countUsable: number;
    state: string;
  } | undefined>;

  upsertCountLine(params: {
    sessionId: string;
    locationId: string;
    itemKey: string;
    mode: 'set' | 'accumulate';
    qty: number;
    exceptions?: CountException[]; // Only if updating exceptions
  }, opts?: { isOutOfScope?: boolean }): Promise<{
    actualQty: number; // Returns new total
  }>;

  isItemInLocationScope(params: {
    sessionId: string;
    locationId: string;
    itemKey: string;
  }): Promise<{
    inScope: boolean;
    hasMapping: boolean;
  }>;

  findAllCountLinesForItem(params: {
    sessionId: string;
    itemKey: string;
  }): Promise<Array<{
    locationId: string;
    countTotal: number;
    countUsable: number;
    exceptions: CountException[];
    state: string;
    updatedAt: number;
  }>>;
}

export interface ExportRepo {
  getExportRows(params: {
    sessionId: string;
    snapshotId: SnapshotId;
    warehouseName: string;
  }): Promise<
    Array<{
      warehouseName: string;
      itemCode: string;
      itemName: string;
      uom: string;
      onHandQty: number;
      actualQty: number | null;
      diffQty: number | null;
      note: string | null;
    }>
  >;

  getExportSummaryRows(params: {
    sessionId: string;
    snapshotId: SnapshotId;
    warehouseName: string;
  }): Promise<
    Array<{
      warehouseName: string;
      itemCode: string;
      itemName: string;
      uom: string;
      onHandQty: number;
      totalCount: number | null;
      totalUsable: number | null;
      outOfScopeCount: number;
    }>
  >;

  getExportDetailRows(params: {
    sessionId: string;
    snapshotId: SnapshotId;
    warehouseName: string;
  }): Promise<
    Array<{
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
      isOutOfScope: number;
      updatedAt: number | null;
    }>
  >;

  getExportStats(params: {
    sessionId: string;
    snapshotId: SnapshotId;
    warehouseName: string;
  }): Promise<{
    total: number;
    scanned: number;
    inScopeScanned: number;
    diffCount: number;
    mapped: number;
    outOfScope: number;
  }>;

  getExportTotal(params: {
    sessionId: string;
    snapshotId: SnapshotId;
    warehouseName: string;
    search?: string;
    diffOnly?: boolean;
  }): Promise<number>;

  searchExportRows(params: {
    sessionId: string;
    snapshotId: SnapshotId;
    warehouseName: string;
    limit: number;
    offset: number;
    search?: string;
    diffOnly?: boolean;
  }): Promise<
    Array<{
      warehouseName: string;
      itemCode: string;
      itemName: string;
      uom: string;
      onHandQty: number;
      actualQty: number | null;
      diffQty: number | null;
      outOfScopeCount: number;
      note: string | null;
    }>
  >;
}
