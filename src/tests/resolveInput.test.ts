import { resolveInputToItem } from '@/domain/usecases/resolveInputToItem';

test('resolveInput returns MATCHED on itemCode exact', async () => {
  const snapshotRepo = {
    hasSnapshot: async () => true,
    getRowByItemCode: async () => ({ itemKey: 'A1', itemCode: 'A1', itemName: 'Test', uom: 'HOP', onHandQty: 5 }),
    getRowByItemKey: async () => undefined,
    searchRows: async () => [],
  };
  const aliasRepo = { getItemKeyByBarcode: async () => undefined };

  const res = await resolveInputToItem({
    input: { snapshotId: 'snap1', warehouseName: 'Kho A', query: 'A1' },
    snapshotRepo: snapshotRepo as any,
    aliasRepo: aliasRepo as any,
  });

  expect(res.type).toBe('single');
});
