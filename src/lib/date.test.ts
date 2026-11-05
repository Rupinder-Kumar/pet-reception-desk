import { formatAge, formatDate, todayISO } from './date';

describe('date helpers', () => {
  it('formats the local date with zero padding', () => {
    expect(todayISO(new Date(2024, 0, 5, 23, 59))).toBe('2024-01-05');
  });
  it('formats ISO dates for display without time-zone shift', () => {
    expect(formatDate('2024-01-05')).toBe('5 Jan 2024');
    expect(formatDate('garbage')).toBe('garbage');
  });
  it('computes compact ages', () => {
    expect(formatAge('2020-02-02', new Date(2024, 1, 2))).toBe('4 y');
    expect(formatAge('2024-01-15', new Date(2024, 3, 14))).toBe('2 mo');
    expect(formatAge('2999-01-01', new Date(2024, 0, 1))).toBe('0 mo');
  });
});
