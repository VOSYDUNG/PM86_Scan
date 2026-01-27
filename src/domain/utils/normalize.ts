export function stripDiacritics(input: string): string {
  // Remove Vietnamese accents and other diacritics
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normKey(input: string): string {
  return stripDiacritics(input)
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function normSearch(input: string): string {
  return stripDiacritics(input)
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function tokenizeNorm(input: string): string[] {
  const s = normSearch(input);
  if (!s) return [];
  return s.split(' ').filter(Boolean);
}
