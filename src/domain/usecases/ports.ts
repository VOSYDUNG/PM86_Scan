import { Candidate, CountException, ItemKey, SnapshotId } from '@/domain/entities/types';

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
  deleteSnapshot(snapshotId: string): Promise<void>;
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
  }): Promise<{
    actualQty: number; // Returns new total
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
      updatedAt: number | null;
    }>
  >;

  getExportStats(params: {
    sessionId: string;
    snapshotId: SnapshotId;
    warehouseName: string;
  }): Promise<{ total: number; scanned: number; diffCount: number }>;

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
      note: string | null;
    }>
  >;
}
