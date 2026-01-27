import { ReasonCode } from '@/domain/entities/types';
import { composeNote } from '@/domain/usecases/composeNote';
import { ActualRepo, SnapshotRepo } from '@/domain/usecases/ports';

export async function updateActualQty(params: {
  sessionId: string;
  snapshotId: string;
  warehouseName: string;
  itemKey: string;
  mode: 'set' | 'accumulate';
  value: number; // set value or delta
  reasonCode?: ReasonCode;
  reasonText?: string;
  extraText?: string;
  snapshotRepo: SnapshotRepo;
  actualRepo: ActualRepo;
}): Promise<{ actualQty: number; diffQty: number }> {
  const row = await params.snapshotRepo.getRowByItemKey({
    snapshotId: params.snapshotId,
    warehouseName: params.warehouseName,
    itemKey: params.itemKey,
  });
  if (!row) {
    throw new Error('ITEM_NOT_FOUND_IN_SNAPSHOT');
  }

  const prev = await params.actualRepo.getActual({
    sessionId: params.sessionId,
    itemKey: params.itemKey,
  });

  let actualQty = 0;
  if (params.mode === 'set') {
    actualQty = params.value;
  } else {
    actualQty = (prev?.actualQty ?? 0) + params.value;
  }

  const diffQty = actualQty - row.onHandQty;
  const updatedAt = Date.now();
  const note = composeNote({
    reasonCode: params.reasonCode,
    reasonText: params.reasonText,
    extraText: params.extraText,
  });

  await params.actualRepo.upsertActual({
    sessionId: params.sessionId,
    itemKey: params.itemKey,
    actualQty,
    diffQty,
    reasonCode: params.reasonCode,
    reasonText: params.reasonText,
    note,
    updatedAt,
  });

  return { actualQty, diffQty };
}
