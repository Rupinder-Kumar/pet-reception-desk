import { ownerFormSchema, petFormSchema, visitFormSchema } from './forms';
import { todayISO } from '../lib/date';

const owner = { firstName: 'Ann', lastName: 'Lee', address: 'C', city: 'D', telephone: '123456' };
const ok = (v: object) => ownerFormSchema.safeParse({ ...owner, ...v }).success;

describe('owner form schema (rules from the OpenAPI OwnerFields schema)', () => {
  it('accepts a valid owner and trims whitespace', () => {
    expect(ownerFormSchema.parse({ ...owner, firstName: '  Ann ' }).firstName).toBe('Ann');
  });
  it.each(['', '+123', '12 34', '1'.repeat(21)])('rejects telephone %j', (telephone) => expect(ok({ telephone })).toBe(false));
  it('accepts telephones up to 20 digits', () => expect(ok({ telephone: '1'.repeat(20) })).toBe(true));
  it.each(['Mary-Jane', 'Jean Luc', 'José', "O'Neil"])('accepts name %j', (n) => expect(ok({ firstName: n, lastName: n })).toBe(true));
  it.each(['R2D2', 'Ann!', '', 'A'.repeat(31)])('rejects first name %j', (firstName) => expect(ok({ firstName })).toBe(false));
  it('allows a trailing dot only on last names', () => {
    expect(ok({ lastName: 'Jr.' })).toBe(true);
    expect(ok({ firstName: 'Ann.' })).toBe(false);
  });
  it('enforces address and city length limits', () => {
    expect(ok({ address: 'x'.repeat(256) })).toBe(false);
    expect(ok({ city: 'x'.repeat(81) })).toBe(false);
  });
});

describe('pet and visit form schemas', () => {
  it('rejects a pet born in the future', () => {
    expect(petFormSchema.safeParse({ name: 'Rex', birthDate: '2999-01-01', typeId: '1' }).success).toBe(false);
    expect(petFormSchema.safeParse({ name: 'Rex', birthDate: todayISO(), typeId: '1' }).success).toBe(true);
  });
  it('requires a visit description of at most 255 characters', () => {
    expect(visitFormSchema.safeParse({ date: todayISO(), description: '   ' }).success).toBe(false);
    expect(visitFormSchema.safeParse({ date: todayISO(), description: 'x'.repeat(256) }).success).toBe(false);
  });
});
