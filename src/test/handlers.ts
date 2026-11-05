/**
 * In-memory fake of the PetClinic REST API used by the tests (MSW).
 * It mirrors the behaviours the frontend relies on: `lastName` prefix filter, 201 + body on POST,
 * 204 on PUT, owner payload embedding pets and visits.
 * Contract drift between this fake and the real backend is a known risk (README) -> run the manual smoke test.
 */
import { http, HttpResponse } from 'msw';
import type { Owner, Pet, PetType } from '../api/schemas';

export const API = 'http://localhost:9966/petclinic/api';

const types: PetType[] = [
  { id: 1, name: 'cat' },
  { id: 2, name: 'dog' },
];

const seed = (): Owner[] => [
  {
    id: 1, firstName: 'George', lastName: 'Franklin', address: '110 W. Liberty St.', city: 'Madison', telephone: '6085551023',
    pets: [{ id: 1, name: 'Leo', birthDate: '2010-09-07', type: types[0]!, ownerId: 1, visits: [{ id: 1, date: '2024-01-10', description: 'Rabies shot', petId: 1 }] }],
  },
  { id: 2, firstName: 'Betty', lastName: 'Davis', address: '638 Cardinal Ave.', city: 'Sun Prairie', telephone: '6085551749', pets: [] },
];

let owners: Owner[] = seed();
let nextId = 100;
export const resetDb = () => {
  owners = seed();
  nextId = 100;
};

/** Direct access to the fake database, for arranging server-side changes inside a test. */
export const dbOwner = (id: number) => owners.find((o) => o.id === id);

const findOwner = (id: string) => owners.find((o) => o.id === Number(id));
const notFound = () => HttpResponse.json({ message: 'Not found' }, { status: 404 });

export const handlers = [
  http.get(`${API}/pettypes`, () => HttpResponse.json(types)),
  http.get(`${API}/owners`, ({ request }) => {
    const q = new URL(request.url).searchParams.get('lastName')?.toLowerCase();
    return HttpResponse.json(q ? owners.filter((o) => o.lastName.toLowerCase().startsWith(q)) : owners);
  }),
  http.get(`${API}/owners/:id`, ({ params }) => {
    const o = findOwner(String(params.id));
    return o ? HttpResponse.json(o) : notFound();
  }),
  http.post(`${API}/owners`, async ({ request }) => {
    const body = (await request.json()) as Omit<Owner, 'id' | 'pets'>;
    const o: Owner = { ...body, id: nextId++, pets: [] };
    owners.push(o);
    return HttpResponse.json(o, { status: 201 });
  }),
  http.put(`${API}/owners/:id`, async ({ params, request }) => {
    const o = findOwner(String(params.id));
    if (!o) return notFound();
    Object.assign(o, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${API}/owners/:id/pets`, async ({ params, request }) => {
    const o = findOwner(String(params.id));
    if (!o) return notFound();
    const body = (await request.json()) as Pick<Pet, 'name' | 'birthDate' | 'type'>;
    const pet: Pet = { ...body, id: nextId++, ownerId: o.id, visits: [] };
    o.pets.push(pet);
    return HttpResponse.json(pet, { status: 201 });
  }),
  http.put(`${API}/owners/:id/pets/:petId`, async ({ params, request }) => {
    const pet = findOwner(String(params.id))?.pets.find((p) => p.id === Number(params.petId));
    if (!pet) return notFound();
    Object.assign(pet, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${API}/owners/:id/pets/:petId/visits`, async ({ params, request }) => {
    const pet = findOwner(String(params.id))?.pets.find((p) => p.id === Number(params.petId));
    if (!pet) return notFound();
    const body = (await request.json()) as { date: string; description: string };
    const visit = { ...body, id: nextId++, petId: pet.id };
    pet.visits.push(visit);
    return HttpResponse.json(visit, { status: 201 });
  }),
];
