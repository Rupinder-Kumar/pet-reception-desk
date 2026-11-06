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

export const listPetTypes = (): Promise<PetType[]> => requestJson('/pettypes', petTypesSchema);

export const getOwner = (id: number): Promise<Owner> => requestJson(`/owners/${id}`, ownerSchema);

/**
 * All owners (with pets and visits). The API's only filter is `lastName`, which is too narrow for the reception
 * desk, so searching is done locally (see `lib/ownerSearch.ts`). Unpaginated `GET /owners` is used because it is
 * the endpoint in the provided README; a paginated `/v2/owners` exists in newer builds (README "API problems" #1).
 */
export const listOwners = (): Promise<Owner[]> => requestJson('/owners', ownersSchema);

// PUT endpoints answer 204 with no body, so callers refetch (or invalidate) instead of reading a response.
export const createOwner = (input: OwnerInput): Promise<Owner> => requestJson('/owners', ownerSchema, { method: 'POST', body: input });

export const updateOwner = (id: number, input: OwnerInput): Promise<void> => requestVoid(`/owners/${id}`, { method: 'PUT', body: input });

export const createPet = (ownerId: number, pet: PetPayload): Promise<Pet> =>
  requestJson(`/owners/${ownerId}/pets`, petSchema, { method: 'POST', body: pet });

export const updatePet = (ownerId: number, petId: number, pet: PetPayload): Promise<void> =>
  requestVoid(`/owners/${ownerId}/pets/${petId}`, { method: 'PUT', body: pet }); // body is `PetFields`: the id travels in the path

export const addVisit = (ownerId: number, petId: number, visit: VisitInput): Promise<Visit> =>
  requestJson(`/owners/${ownerId}/pets/${petId}/visits`, visitSchema, { method: 'POST', body: visit });
