import { stripDiacritics, normKey, tokenizeNorm } from '@/domain/utils/normalize';

test('stripDiacritics removes Vietnamese accents', () => {
  expect(stripDiacritics('điện thoại')).toBe('dien thoai');
});

test('normKey uppercases and removes spaces', () => {
  expect(normKey('  aB c ')).toBe('ABC');
});

test('tokenizeNorm splits into tokens', () => {
  expect(tokenizeNorm('A  B  C')).toEqual(['A', 'B', 'C']);
});
