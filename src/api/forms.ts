/**
 * Form (input) schemas. They encode the backend's validation rules so the receptionist
 * gets feedback immediately instead of a 400 after submit. The backend remains the authority.
 */
import { z } from 'zod';
import { todayISO } from '../lib/date';

const required = (label: string) => z.string().trim().min(1, `${label} is required`);

// Rules copied from the OpenAPI `OwnerFields` schema (see README). The backend stays authoritative.
const NAME = /^\p{L}+([ '-]\p{L}+){0,2}$/u;
const LAST_NAME = /^\p{L}+([ '-]\p{L}+){0,2}\.?$/u;

export const ownerFormSchema = z.object({
  firstName: required('First name').pipe(
    z.string().max(30, 'Max 30 characters').regex(NAME, 'Letters only (spaces, hyphens, apostrophes allowed)'),
  ),
  lastName: required('Last name').pipe(
    z.string().max(30, 'Max 30 characters').regex(LAST_NAME, 'Letters only (spaces, hyphens, apostrophes allowed)'),
  ),
  address: required('Address').pipe(z.string().max(255, 'Max 255 characters')),
  city: required('City').pipe(z.string().max(80, 'Max 80 characters')),
  // API problem #3: digits only, max 20 (no +, spaces or dashes).
  telephone: z
    .string()
    .trim()
    .regex(/^\d{1,20}$/, 'Telephone must be 1–20 digits, no spaces or symbols'),
});
export type OwnerInput = z.infer<typeof ownerFormSchema>;

export const petFormSchema = z.object({
  name: required('Pet name').pipe(z.string().max(30, 'Max 30 characters')),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date is required')
    .refine((d) => d <= todayISO(), 'Birth date cannot be in the future'),
  typeId: z.string().min(1, 'Select a pet type'),
});
export type PetFormValues = z.infer<typeof petFormSchema>;

export const visitFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Visit date is required'),
  description: required('Description').pipe(z.string().max(255, 'Max 255 characters')),
});
export type VisitInput = z.infer<typeof visitFormSchema>;
