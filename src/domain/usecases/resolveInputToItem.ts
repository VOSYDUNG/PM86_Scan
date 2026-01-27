import { Candidate, ResolveInput, ResolveResult } from '@/domain/entities/types';
import { tokenizeNorm, normKey, normSearch } from '@/domain/utils/normalize';
import { BarcodeAliasRepo, SnapshotRepo } from '@/domain/usecases/ports';

function scoreCandidate(c: {
  itemCode: string;
  itemName: string;
  nameNorm: string;
  codeNorm: string;
}, query: {
  raw: string;
  key: string;
  search: string;
  tokens: string[];
}): number {
  let score = 0;

  // Exact itemCode
  if (c.codeNorm === query.key) score += 100;

  // Name starts with query
  if (c.nameNorm.startsWith(query.search.replace(/\s+/g, ''))) {
    // If we removed spaces, startsWith on nameNorm may be too strict; keep additional check below
  }

  if (c.itemName.toUpperCase().startsWith(query.raw.toUpperCase())) score += 60;
  if (c.itemName.toUpperCase().includes(query.raw.toUpperCase())) score += 40;

  // Token overlap
  for (const t of query.tokens) {
    if (!t) continue;
    if (c.itemName.toUpperCase().includes(t)) score += 20;
  }

  // Raw code match
  if (c.itemCode.toUpperCase().includes(query.raw.toUpperCase())) score += 10;
  
  // Normalized code match (Fix for space issues: "893 609" matches "893609")
  if (c.codeNorm.includes(query.key) && query.key.length > 3) score += 10;

  return score;
}

export async function resolveInputToItem(params: {
  input: ResolveInput;
  snapshotRepo: SnapshotRepo;
  aliasRepo: BarcodeAliasRepo;
  limit?: number;
}): Promise<ResolveResult> {
  const { input, snapshotRepo, aliasRepo } = params;
  const limit = params.limit ?? 10;

  const qRaw = input.query.trim();
  if (!qRaw) return { type: 'unknown' };

  const qKey = normKey(qRaw);
  const qSearch = normSearch(qRaw);

  // Step 1: Barcode alias exact
  const aliasHit = await aliasRepo.getItemKeyByBarcode(qKey);
  if (aliasHit) return { type: 'single', itemKey: aliasHit, source: 'alias' };

  // Step 2/3: Exact match itemCode
  const exact = await snapshotRepo.getRowByItemCode({
    snapshotId: input.snapshotId,
    warehouseName: input.warehouseName,
    itemCode: qRaw,
    codeNorm: qKey,
  });
  if (exact) return { type: 'single', itemKey: exact.itemKey, source: 'code' };

  // Step 4/5: Search + suggestions
  const rows = await snapshotRepo.searchRows({
    snapshotId: input.snapshotId,
    warehouseName: input.warehouseName,
    queryNorm: qSearch,
    limit: Math.max(limit * 2, 30),
  });

  const query = {
    raw: qRaw,
    key: qKey,
    search: qSearch,
    tokens: tokenizeNorm(qRaw),
  };

  const scored: Candidate[] = rows
    .map((r) => ({
      itemKey: r.itemKey,
      itemCode: r.itemCode,
      itemName: r.itemName,
      uom: r.uom,
      onHandQty: r.onHandQty,
      score: scoreCandidate(r, query),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length === 1 && scored[0].score >= 100) {
    return { type: 'single', itemKey: scored[0].itemKey, source: 'score' };
  }

  if (scored.length > 0) return { type: 'suggest', candidates: scored };
  return { type: 'unknown' };
}
