import { sortVisits } from './VisitList';

it('sorts newest first and breaks same-day ties by id', () => {
  const v = (id: number, date: string) => ({ id, date, description: '' });
  expect(sortVisits([v(1, '2024-01-01'), v(2, '2024-03-01'), v(3, '2024-03-01')]).map((x) => x.id)).toEqual([3, 2, 1]);
});
