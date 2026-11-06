import type { Owner } from '../api/schemas';
import { buildOwnerIndex, searchOwnerIndex } from './ownerSearch';

const cat = { id: 1, name: 'Leo', birthDate: '2020-01-01', type: { id: 1, name: 'cat' }, visits: [] };
const mk = (id: number, firstName: string, lastName: string, city: string, telephone: string, pets: Owner['pets'] = []): Owner => ({
  id,
  firstName,
  lastName,
  address: 'x',
  city,
  telephone,
  pets,
});
const owners = [
  mk(1, 'George', 'Franklin', 'Madison', '6085551023', [cat]),
  mk(2, 'Betty', 'Davis', 'Sun Prairie', '6085551749'),
  mk(3, 'José', "O'Neil", 'Windsor', '6085558763', [{ ...cat, id: 2, name: 'Rosy' }]),
  mk(4, 'Davina', 'Frank', 'Madison', '6085552222'),
];
const index = buildOwnerIndex(owners);
const names = (term: string) => searchOwnerIndex(index, term).map((o) => o.lastName);

describe('searchOwnerIndex', () => {
  it('returns everyone A-Z for an empty or blank term', () => {
    expect(names('')).toEqual(['Davis', 'Frank', 'Franklin', "O'Neil"]);
    expect(names('   ')).toHaveLength(4);
  });
  it('matches by last name prefix, case-insensitively', () => expect(names('DAV')).toEqual(['Davis', 'Frank']));
  it('ranks a last-name match above a first-name match', () => {
    // "dav": Davis (last name prefix) must come before Frank (first name Davina).
    expect(names('dav')[0]).toBe('Davis');
  });
  it('matches first name, full name in either order, and partial tokens', () => {
    expect(names('betty')).toEqual(['Davis']);
    expect(names('george franklin')).toEqual(['Franklin']);
    expect(names('franklin george')).toEqual(['Franklin']);
    expect(names('geo fran')).toEqual(['Franklin']);
  });
  it('requires every token to match', () => expect(names('george davis')).toEqual([]));
  it('matches phone numbers regardless of formatting, including partial', () => {
    expect(names('608-555-1749')).toEqual(['Davis']);
    expect(names('(608) 555 8763')).toEqual(["O'Neil"]);
    expect(names('1023')).toEqual(['Franklin']);
  });
  it('matches city and pet name', () => {
    expect(names('madison').sort()).toEqual(['Frank', 'Franklin']);
    expect(names('rosy')).toEqual(["O'Neil"]);
    expect(names('leo')).toEqual(['Franklin']);
  });
  it('ignores accents and apostrophes in names', () => {
    expect(names('jose')).toEqual(["O'Neil"]);
    expect(names('oneil')).toEqual(["O'Neil"]);
    expect(names('neil')).toEqual(["O'Neil"]);
    expect(names("o'neil")).toEqual(["O'Neil"]);
  });
  it('returns nothing when nothing matches', () => expect(names('zzz')).toEqual([]));
});
