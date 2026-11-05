/**
 * Typed client for the Spring PetClinic REST API. The only module that knows URLs and payload shapes.
 * Everything above this layer works with the domain types from `schemas.ts`.
 */
import { requestJson, requestVoid } from './http';
import { ownerSchema, ownersSchema, petSchema, petTypesSchema, visitSchema } from './schemas';
import type { Owner, Pet, PetType, Visit } from './schemas';
import type { OwnerInput, VisitInput } from './forms';

export interface PetPayload {
  name: string;
  birthDate: string;
  type: PetType;
}

const enc = encodeURIComponent;

export const listPetTypes = (): Promise<PetType[]> => requestJson('/pettypes', petTypesSchema);

export const getOwner = (id: number): Promise<Owner> => requestJson(`/owners/${id}`, ownerSchema);

const listOwners = (lastName?: string): Promise<Owner[]> =>
  requestJson(lastName ? `/owners?lastName=${enc(lastName)}` : '/owners', ownersSchema);

/**
 * Receptionists search by whatever the customer says: surname, full name or phone number.
 * The API only supports a `lastName` prefix filter (README "API problems" #2), so:
 *  - a single word of letters  -> server-side filter (cheap, scales);
 *  - anything else (digits, "Jane Doe") -> fetch all owners and filter locally (workaround, O(n)).
 */
export async function searchOwners(term: string): Promise<Owner[]> {
  const q = term.trim();
  if (q === '') return listOwners();
  if (/^\p{L}[\p{L}'-]*$/u.test(q)) return listOwners(q);
  const needle = q.toLowerCase();
  const digits = q.replace(/\D/g, '');
  const all = await listOwners();
  return all.filter((o) => {
    const full = `${o.firstName} ${o.lastName}`.toLowerCase();
    return full.includes(needle) || (digits.length > 0 && o.telephone.includes(digits));
  });
}

// PUT endpoints answer 204 with no body, so callers refetch (or invalidate) instead of reading a response.
export const createOwner = (input: OwnerInput): Promise<Owner> =>
  requestJson('/owners', ownerSchema, { method: 'POST', body: input });

export const updateOwner = (id: number, input: OwnerInput): Promise<void> =>
  requestVoid(`/owners/${id}`, { method: 'PUT', body: input });

export const createPet = (ownerId: number, pet: PetPayload): Promise<Pet> =>
  requestJson(`/owners/${ownerId}/pets`, petSchema, { method: 'POST', body: pet });

export const updatePet = (ownerId: number, petId: number, pet: PetPayload): Promise<void> =>
  requestVoid(`/owners/${ownerId}/pets/${petId}`, { method: 'PUT', body: { id: petId, ...pet } });

export const addVisit = (ownerId: number, petId: number, visit: VisitInput): Promise<Visit> =>
  requestJson(`/owners/${ownerId}/pets/${petId}/visits`, visitSchema, { method: 'POST', body: visit });
