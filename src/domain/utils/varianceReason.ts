export type VarianceReasonKey =
  | 'matched'
  | 'positiveSmall'
  | 'positiveMedium'
  | 'positiveLarge'
  | 'negativeSmall'
  | 'negativeMedium'
  | 'negativeLarge';

const VI_REASON_LABELS: Record<VarianceReasonKey, string> = {
  matched: 'Khớp sổ trong kỳ kiểm kê; chưa ghi nhận chênh lệch cần xử lý.',
  positiveSmall: 'Lệch dương nhỏ: khả năng sai số kiểm đếm hoặc quy đổi đơn vị; cần kiểm đếm lại nhanh.',
  positiveMedium: 'Lệch dương trung bình: cần đối soát nhập kho/chuyển kho trong kỳ.',
  positiveLarge: 'Lệch dương lớn: khả năng hàng đã nhập/chuyển về nhưng sổ chưa phản ánh kịp.',
  negativeSmall: 'Lệch âm nhỏ: khả năng sai số thao tác hoặc hao hụt kiểm đếm.',
  negativeMedium: 'Lệch âm trung bình: cần đối soát xuất kho/bán hàng/điều chuyển.',
  negativeLarge: 'Lệch âm lớn: tín hiệu xuất bán/xuất kho cao hoặc ghi nhận xuất chưa đồng bộ.',
};

export function deriveVarianceReasonKey(diff: number): VarianceReasonKey {
  if (diff === 0) return 'matched';
  if (diff > 0) {
    if (diff <= 2) return 'positiveSmall';
    if (diff <= 10) return 'positiveMedium';
    return 'positiveLarge';
  }
  const absDiff = Math.abs(diff);
  if (absDiff <= 2) return 'negativeSmall';
  if (absDiff <= 10) return 'negativeMedium';
  return 'negativeLarge';
}

export function deriveVarianceReason(diff: number, outOfScopeCount = 0): string {
  const key = deriveVarianceReasonKey(diff);
  const suffix = outOfScopeCount > 0
    ? ' Có ghi nhận SKU ngoài danh mục vị trí-SKU; cần rà soát phân bổ vị trí.'
    : '';
  return `${VI_REASON_LABELS[key]}${suffix}`;
}
