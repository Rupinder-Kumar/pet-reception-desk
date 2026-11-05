import { ownerFormSchema, petFormSchema, visitFormSchema } from './forms';
import { todayISO } from '../lib/date';

const owner = { firstName: 'A', lastName: 'B', address: 'C', city: 'D', telephone: '123456' };

describe('form schemas', () => {
  it('accepts a valid owner and trims whitespace', () => {
    expect(ownerFormSchema.parse({ ...owner, firstName: '  Ann ' }).firstName).toBe('Ann');
  });

  it.each(['', '12345678901', '+123', '12 34'])('rejects telephone %j', (telephone) => {
    expect(ownerFormSchema.safeParse({ ...owner, telephone }).success).toBe(false);
  });

  it('rejects a pet born in the future', () => {
    expect(petFormSchema.safeParse({ name: 'Rex', birthDate: '2999-01-01', typeId: '1' }).success).toBe(false);
    expect(petFormSchema.safeParse({ name: 'Rex', birthDate: todayISO(), typeId: '1' }).success).toBe(true);
  });

  it('requires a visit description', () => {
    expect(visitFormSchema.safeParse({ date: todayISO(), description: '   ' }).success).toBe(false);
  });
});
