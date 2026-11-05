/**
 * Runtime schemas for data crossing the API boundary.
 * Types are *inferred* from the schemas, so the compile-time and runtime views cannot drift.
 * Server responses are parsed (not cast): a contract change fails loudly at the boundary
 * instead of producing `undefined` deep inside the UI.
 */
import { z } from 'zod';

export const petTypeSchema = z.object({ id: z.number(), name: z.string() });

export const visitSchema = z.object({
  id: z.number(),
  /** ISO calendar date `yyyy-MM-dd` (the API has no time component). */
  date: z.string(),
  description: z.string(),
  petId: z.number().nullish(),
});

export const petSchema = z.object({
  id: z.number(),
  name: z.string(),
  birthDate: z.string(),
  type: petTypeSchema,
  ownerId: z.number().nullish(),
  visits: z.array(visitSchema).default([]),
});

export const ownerSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  city: z.string(),
  telephone: z.string(),
  pets: z.array(petSchema).default([]),
});

export type PetType = z.infer<typeof petTypeSchema>;
export type Visit = z.infer<typeof visitSchema>;
export type Pet = z.infer<typeof petSchema>;
export type Owner = z.infer<typeof ownerSchema>;

export const ownersSchema = z.array(ownerSchema);
export const petTypesSchema = z.array(petTypeSchema);
