/**
 * Local owner search.
 *
 * The API can only filter by `lastName` (OpenAPI: GET /owners?lastName=). A receptionist needs to find people by
 * whatever the customer says: first name, phone, city, the pet's name. So the full list is fetched once, cached,
 * and searched here: instant, no request per keystroke, works across fields.
 *
 * Scaling limit: O(n) in memory. Fine for hundreds/low thousands of owners; beyond that this needs a server-side
 * search endpoint (README "API problems" #2) - the pure functions below are the seam to swap out.
 *
 * Matching rules (every whitespace-separated token must match, so "franklin george" and "george fran" both work):
 *  - token made of digits/phone punctuation -> substring match on the telephone's digits;
 *  - otherwise -> match on a word *prefix* (best) or a substring of last name, first name, pet name or city.
 * Accents are ignored ("jose" finds "José").
 */
import type { Owner } from '../api/schemas';

/** Lower-case and strip diacritics. */
export const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
/** Words of a name. Apostrophes yield both forms: "O'Neil" -> "oneil", "o", "neil" (people type it any of those ways). */
const words = (s: string): string[] =>
  fold(s)
    .split(/[\s.-]+/)
    .filter(Boolean)
    .flatMap((w) => (/['’]/.test(w) ? [w.replace(/['’]/g, ''), ...w.split(/['’]/).filter(Boolean)] : [w]));

export interface OwnerIndex {
  readonly entries: readonly Entry[];
}
interface Entry {
  owner: Owner;
  last: string[];
  first: string[];
  city: string[];
  pets: string[][];
  phone: string;
}

/** Pre-computes folded words once per data refresh, so each keystroke only does cheap comparisons. */
export function buildOwnerIndex(owners: readonly Owner[]): OwnerIndex {
  return {
    entries: owners.map((owner) => ({
      owner,
      last: words(owner.lastName),
      first: words(owner.firstName),
      city: words(owner.city),
      pets: owner.pets.map((p) => words(p.name)),
      phone: owner.telephone.replace(/\D/g, ''),
    })),
  };
}

const PHONE_TOKEN = /^[\d+()\-.]+$/;

/** Prefix of a word scores `prefixScore`; a mere substring scores 1; no match 0. */
function fieldScore(ws: readonly string[], token: string, prefixScore: number): number {
  if (ws.some((w) => w.startsWith(token))) return prefixScore;
  return ws.some((w) => w.includes(token)) ? 1 : 0;
}

function tokenScore(e: Entry, token: string): number {
  if (PHONE_TOKEN.test(token)) {
    const digits = token.replace(/\D/g, '');
    if (!digits || !e.phone.includes(digits)) return 0;
    return e.phone.startsWith(digits) ? 3 : 2;
  }
  return Math.max(
    fieldScore(e.last, token, 4),
    fieldScore(e.first, token, 3),
    ...e.pets.map((p) => fieldScore(p, token, 3)),
    fieldScore(e.city, token, 2),
  );
}

/** Owners matching every token, best matches first, ties broken alphabetically. Empty term -> everyone, A-Z. */
export function searchOwnerIndex(index: OwnerIndex, term: string): Owner[] {
  const tokens = fold(term).replace(/['’]/g, '').split(/\s+/).filter(Boolean); // same normalisation as the indexed words
  const scored: { owner: Owner; score: number }[] = [];
  for (const e of index.entries) {
    let total = 0;
    let ok = true;
    for (const t of tokens) {
      const s = tokenScore(e, t);
      if (s === 0) {
        ok = false;
        break;
      }
      total += s;
    }
    if (ok) scored.push({ owner: e.owner, score: total });
  }
  return scored
    .sort(
      (a, b) => b.score - a.score || a.owner.lastName.localeCompare(b.owner.lastName) || a.owner.firstName.localeCompare(b.owner.firstName),
    )
    .map((s) => s.owner);
}
