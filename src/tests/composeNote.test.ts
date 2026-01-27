import { composeNote } from '@/domain/usecases/composeNote';

test('composeNote uses reason label', () => {
  expect(composeNote({ reasonCode: 'DAMAGED' })).toBe('Hàng hư hỏng');
});

test('composeNote uses OTHER with text', () => {
  expect(composeNote({ reasonCode: 'OTHER', reasonText: 'Bị ướt' })).toBe('Khác: Bị ướt');
});
