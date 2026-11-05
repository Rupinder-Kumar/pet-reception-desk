/**
 * Form (input) schemas. They encode the backend's validation rules so the receptionist
 * gets feedback immediately instead of a 400 after submit. The backend remains the authority.
 */
import { z } from 'zod';
import { todayISO } from '../lib/date';

const required = (label: string) => z.string().trim().min(1, `${label} is required`);

export const ownerFormSchema = z.object({
  firstName: required('First name'),
  lastName: required('Last name'),
  address: required('Address'),
  city: required('City'),
  // Backend rule (@Digits, max 10 digits). See README "API problems" #3.
  telephone: z
    .string()
    .trim()
    .regex(/^\d{1,10}$/, 'Telephone must be 1–10 digits, no spaces or symbols'),
});
export type OwnerInput = z.infer<typeof ownerFormSchema>;

export const petFormSchema = z.object({
  name: required('Pet name'),
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
