/**
 * Server-state layer (TanStack Query). Rules of the model:
 *
 *  1. The server is the source of truth; ONE cache entry per owner (`GET /owners/{id}` embeds pets + visits)
 *     feeds the owner panel, pet list and pet panel. No denormalised copies.
 *  2. Selecting an owner is instant: `usePrimeOwner` copies the owner from the owner list already in cache
 *     into the owner entry, which then refreshes in the background (stale-while-revalidate). It is an explicit,
 *     one-shot write at selection time. (An `initialData` option was rejected: TanStack re-applies it to an
 *     errored query without data, silently masking a 404 behind stale list data.)
 *  3. Registering a visit is optimistic (the hottest path at the desk) with rollback on failure.
 *  4. Edits are guarded by a client-side conflict check (workaround for the missing ETag).
 *  5. Invalidation is targeted: a visit does not refetch search lists, an owner edit does.
 */
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import * as api from '../api/petclinic';
import { ConflictError } from '../api/http';
import type { OwnerInput, VisitInput } from '../api/forms';
import type { Owner, Pet } from '../api/schemas';

export const keys = {
  /** Prefix of every owner *list* (and nothing else). */
  owners: ['owners'] as const,
  /** The full owner list; searched locally. */
  ownerList: ['owners', 'list'] as const,
  owner: (id: number) => ['owner', id] as const,
  petTypes: ['petTypes'] as const,
};

const ownerQuery = (id: number) =>
  queryOptions({
    queryKey: keys.owner(id),
    queryFn: () => api.getOwner(id),
    // Within 5 s we trust the cache (avoids refetch storms when switching pets); older data refreshes on mount.
    staleTime: 5_000,
  });

/** Copy of an owner from the cached owner list, with the time that list was fetched. Exported for tests. */
export function seedFromList(qc: QueryClient, id: number): { data: Owner; updatedAt: number } | undefined {
  const hit = qc.getQueryData<Owner[]>(keys.ownerList)?.find((o) => o.id === id);
  return hit && { data: hit, updatedAt: qc.getQueryState(keys.ownerList)?.dataUpdatedAt ?? 0 };
}

/**
 * The full owner list, fetched once and searched locally. Kept reasonably fresh for a long-running desk session:
 * refetched on window focus after 30 s, and after owner create/edit.
 */
export const useOwners = () =>
  useQuery({ queryKey: keys.ownerList, queryFn: api.listOwners, staleTime: 30_000, refetchOnWindowFocus: true });

export const useOwner = (id: number | undefined) => useQuery({ ...ownerQuery(id ?? -1), enabled: id !== undefined });

/**
 * Returns a function that pre-fills the owner entry from the cached owner list (no-op if the entry already exists
 * or the owner is not in the list, e.g. a deep link). The original fetch timestamp is kept, so data older than
 * `staleTime` is refetched immediately on mount.
 */
export function usePrimeOwner() {
  const qc = useQueryClient();
  return (id: number) => {
    if (qc.getQueryData(keys.owner(id)) !== undefined) return;
    const seed = seedFromList(qc, id);
    if (seed) qc.setQueryData(keys.owner(id), seed.data, { updatedAt: seed.updatedAt });
  };
}

/** Pet types are reference data: cache for the session. */
export const usePetTypes = () => useQuery({ queryKey: keys.petTypes, queryFn: api.listPetTypes, staleTime: Infinity });

/** Refetch this owner now; mark lists stale (refetch them only when `lists` is true). */
function invalidateOwner(qc: QueryClient, ownerId: number, lists: boolean) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.owner(ownerId) }),
    qc.invalidateQueries({ queryKey: keys.owners, refetchType: lists ? 'active' : 'none' }),
  ]);
}

// ---- conflict detection (see ConflictError) ----------------------------------------------------------------
const CONFLICT_MESSAGE =
  'This record was changed by someone else while you were editing. Close this dialog to see the latest details, then redo your change.';

const sameOwnerFields = (a: Owner, b: Owner) =>
  a.firstName === b.firstName && a.lastName === b.lastName && a.address === b.address && a.city === b.city && a.telephone === b.telephone;

const samePetFields = (a: Pet, b: Pet) => a.name === b.name && a.birthDate === b.birthDate && a.type.id === b.type.id;

export function useCreateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OwnerInput) => api.createOwner(input),
    onSuccess: (created) => {
      qc.setQueryData(keys.owner(created.id), created); // POST returns the full owner: no extra GET needed
      return qc.invalidateQueries({ queryKey: keys.owners });
    },
  });
}

/**
 * @param baseline the owner as it was when the edit dialog opened. If the server copy differs at save time
 *                 the write is refused. A small race window remains between the check and the PUT; only an
 *                 ETag/If-Match on the server can close it.
 */
export function useUpdateOwner(ownerId: number, baseline?: Owner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OwnerInput) => {
      if (baseline) {
        const fresh = await api.getOwner(ownerId);
        if (!sameOwnerFields(fresh, baseline)) throw new ConflictError(CONFLICT_MESSAGE);
      }
      await api.updateOwner(ownerId, input);
    },
    onError: (error) => (error instanceof ConflictError ? invalidateOwner(qc, ownerId, true) : undefined),
    onSuccess: () => invalidateOwner(qc, ownerId, true),
  });
}

export function useCreatePet(ownerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pet: api.PetPayload) => api.createPet(ownerId, pet),
    onSuccess: () => invalidateOwner(qc, ownerId, false), // lists do not show pets' details
  });
}

export function useUpdatePet(ownerId: number, petId: number, baseline?: Pet) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pet: api.PetPayload) => {
      if (baseline) {
        const current = (await api.getOwner(ownerId)).pets.find((p) => p.id === petId);
        if (!current || !samePetFields(current, baseline)) throw new ConflictError(CONFLICT_MESSAGE);
      }
      await api.updatePet(ownerId, petId, pet);
    },
    onError: (error) => (error instanceof ConflictError ? invalidateOwner(qc, ownerId, false) : undefined),
    onSuccess: () => invalidateOwner(qc, ownerId, false),
  });
}

/**
 * Optimistic: the visit appears in the history immediately (temporary negative id, rendered as "Saving…"),
 * is rolled back if the server refuses it, and is replaced by the real record on settle.
 */
export function useAddVisit(ownerId: number, petId: number) {
  const qc = useQueryClient();
  const key = keys.owner(ownerId);
  return useMutation({
    mutationFn: (visit: VisitInput) => api.addVisit(ownerId, petId, visit),
    onMutate: async (visit) => {
      await qc.cancelQueries({ queryKey: key }); // an in-flight refetch must not overwrite the optimistic entry
      const previous = qc.getQueryData<Owner>(key);
      qc.setQueryData<Owner>(
        key,
        (owner) =>
          owner && {
            ...owner,
            pets: owner.pets.map((p) =>
              p.id === petId
                ? { ...p, visits: [...p.visits, { id: -Date.now(), date: visit.date, description: visit.description, petId }] }
                : p,
            ),
          },
      );
      return { previous };
    },
    onError: (_error, _visit, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSettled: () => invalidateOwner(qc, ownerId, false), // awaited: the mutation stays "pending" until the list is truthful
  });
}
