import { stripDiacritics } from '@/domain/utils/normalize';

function pickUnitToken(raw: string): string {
  const unitMatch = raw.match(/\b(\d+)\s*(kg|g|ml|l|oz|pcs|pc|pack|pk|bag|btl|box|set|roll|m)\b/i);
  if (unitMatch) {
    return `${unitMatch[1]}${unitMatch[2].toUpperCase()}`;
  }
  const numMatch = raw.match(/\d+/);
  return numMatch ? numMatch[0] : '';
}

export function suggestSkuFromName(name: string): string {
  const cleaned = stripDiacritics(name || '')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const prefix = pickUnitToken(cleaned);
  const words = cleaned.split(' ').filter((w) => /[A-Za-z]/.test(w));

  let letters = '';
  if (words.length > 0) {
    letters += words[0].replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4);
  }
  if (words.length > 1) {
    letters += words[1].replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
  }
  if (words.length > 2 && letters.length < 6) {
    letters += words[2].replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
  }

  letters = letters.slice(0, 6);
  return `${prefix}${letters}`.toUpperCase();
}
