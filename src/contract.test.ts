/**
 * Contract tests: our assumptions vs. the backend's OpenAPI document (`contract/openapi.yml`).
 *
 * The app tests run against an MSW fake. These tests keep that fake and our form rules honest:
 *   client calls ⊆ fake handlers (the fake errors on unhandled requests)  and  fake handlers ⊆ spec.
 * When the spec changes (refresh the snapshot, see contract/README.md), a failure here names what drifted.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { http, HttpResponse } from 'msw';
import { parse } from 'yaml';
import { addVisit, createOwner, createPet, updateOwner, updatePet } from './api/petclinic';
import { ownerFormSchema, petFormSchema, visitFormSchema } from './api/forms';
import { API, handlers } from './test/handlers';
import { server } from './test/server';

interface Prop {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}
interface Spec {
  paths: Record<string, Record<string, { parameters?: { name: string }[] }>>;
  components: { schemas: Record<string, { required: string[]; properties: Record<string, Prop> }> };
}
const spec = parse(readFileSync(resolve(__dirname, '../contract/openapi.yml'), 'utf8')) as Spec;
const fields = (name: string) => spec.components.schemas[name]!;

describe('endpoints', () => {
  const normalise = (path: string) => path.replace(/\{[^}]+\}/g, '{}').replace(/:\w+/g, '{}');

  it('every endpoint simulated by the test fake exists in the spec with the same method', () => {
    for (const h of handlers) {
      const { method, path } = h.info as { method: string; path: string };
      const rel = normalise(path.replace(API, ''));
      const specPath = Object.keys(spec.paths).find((p) => normalise(p) === rel);
      expect(specPath, `${method} ${rel} is not in the OpenAPI spec`).toBeDefined();
      expect(Object.keys(spec.paths[specPath!]!), `${rel} has no ${method}`).toContain(String(method).toLowerCase());
    }
  });

  it('GET /owners still offers only a lastName filter (if this fails, revisit the local-search decision)', () => {
    const names = (spec.paths['/owners']!.get!.parameters ?? []).map((p) => p.name);
    expect(names).toEqual(['lastName']);
  });
});

describe('form rules agree with the spec', () => {
  const owner = { firstName: 'Ann', lastName: 'Lee', address: 'x', city: 'y', telephone: '123' };
  const accepts = (field: string, value: string) => ownerFormSchema.safeParse({ ...owner, [field]: value }).success;
  const specAccepts = (name: string, value: string) => {
    const p = fields('OwnerFields').properties[name]!;
    return (
      value.length >= (p.minLength ?? 0) &&
      value.length <= (p.maxLength ?? Infinity) &&
      (!p.pattern || new RegExp(p.pattern, 'u').test(value))
    );
  };

  it('the same fields are required', () => {
    expect([...fields('OwnerFields').required].sort()).toEqual(Object.keys(ownerFormSchema.shape).sort());
    expect([...fields('VisitFields').required].sort()).toEqual(Object.keys(visitFormSchema.shape).sort());
  });

  it.each([
    [
      'firstName',
      ['Ann', 'Mary-Jane', "O'Neil", 'Jean Luc', 'Jean Luc Pierre', 'a b c d', 'R2D2', 'Ann!', 'José', 'Ann.', '-Ann', 'Ann-', ''],
    ],
    ['lastName', ['Lee', 'Jr.', "D'Angelo", 'van der Berg', 'a b c d', 'X1', '.', 'Lee..', '']],
    ['telephone', ['', '0', '123', '+123', '12 34', '12-34', '١٢٣', '1'.repeat(20), '1'.repeat(21)]],
  ])('%s: accepts exactly what the spec pattern and limits accept', (field, corpus) => {
    for (const value of corpus) {
      expect(accepts(field, value), `${field}=${JSON.stringify(value)}`).toBe(specAccepts(field, value));
    }
  });

  it.each([
    ['firstName', 'a'],
    ['lastName', 'a'],
    ['address', 'a'],
    ['city', 'a'],
    ['telephone', '1'],
  ])('%s: the length limit matches the spec exactly', (field, ch) => {
    const max = fields('OwnerFields').properties[field]!.maxLength!;
    expect(accepts(field, ch.repeat(max))).toBe(true);
    expect(accepts(field, ch.repeat(max + 1))).toBe(false);
  });

  it('pet name and visit description limits match the spec', () => {
    const petMax = fields('PetFields').properties.name!.maxLength!;
    const pet = (name: string) => petFormSchema.safeParse({ name, birthDate: '2020-01-01', typeId: '1' }).success;
    expect([pet('a'.repeat(petMax)), pet('a'.repeat(petMax + 1))]).toEqual([true, false]);

    const visitMax = fields('VisitFields').properties.description!.maxLength!;
    const visit = (description: string) => visitFormSchema.safeParse({ date: '2024-01-01', description }).success;
    expect([visit('a'.repeat(visitMax)), visit('a'.repeat(visitMax + 1))]).toEqual([true, false]);
  });
});

describe('request bodies only contain fields the spec defines', () => {
  // Captures what each write call really sends on the wire, then compares keys with the spec's request schema.
  async function sentBody(method: 'post' | 'put', urlPattern: string, call: () => Promise<unknown>): Promise<Record<string, unknown>> {
    let captured: Record<string, unknown> = {};
    server.use(
      http[method](`${API}${urlPattern}`, async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: 1,
          firstName: 'a',
          lastName: 'b',
          address: 'c',
          city: 'd',
          telephone: '1',
          pets: [],
          name: 'n',
          birthDate: '2020-01-01',
          type: { id: 1, name: 'cat' },
          date: '2024-01-01',
          description: 'x',
        });
      }),
    );
    await call();
    return captured;
  }
  const specKeys = (schema: string) => Object.keys(fields(schema).properties).sort();
  const owner = { firstName: 'Ann', lastName: 'Lee', address: 'x', city: 'y', telephone: '123' };
  const pet = { name: 'Rex', birthDate: '2020-01-01', type: { id: 1, name: 'cat' } };

  it.each([
    ['POST /owners', 'OwnerFields', () => sentBody('post', '/owners', () => createOwner(owner))],
    ['PUT /owners/{id}', 'OwnerFields', () => sentBody('put', '/owners/1', () => updateOwner(1, owner))],
    ['POST /owners/{id}/pets', 'PetFields', () => sentBody('post', '/owners/1/pets', () => createPet(1, pet))],
    ['PUT /owners/{id}/pets/{id}', 'PetFields', () => sentBody('put', '/owners/1/pets/2', () => updatePet(1, 2, pet))],
    [
      'POST .../visits',
      'VisitFields',
      () => sentBody('post', '/owners/1/pets/2/visits', () => addVisit(1, 2, { date: '2024-01-01', description: 'x' })),
    ],
  ])('%s sends exactly %s', async (_name, schema, send) => {
    expect(Object.keys(await send()).sort()).toEqual(specKeys(schema));
  });
});
