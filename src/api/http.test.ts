import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { server } from '../test/server';
import { API } from '../test/handlers';
import { ApiError, requestJson, requestVoid } from './http';

describe('http client', () => {
  it('parses a valid JSON response through the schema', async () => {
    server.use(http.get(`${API}/x`, () => HttpResponse.json({ a: 1 })));
    await expect(requestJson('/x', z.object({ a: z.number() }))).resolves.toEqual({ a: 1 });
  });

  it('accepts 204 No Content for void requests', async () => {
    server.use(http.put(`${API}/x`, () => new HttpResponse(null, { status: 204 })));
    await expect(requestVoid('/x', { method: 'PUT', body: {} })).resolves.toBeUndefined();
  });

  it('throws ApiError with the server message on 4xx', async () => {
    server.use(http.post(`${API}/x`, () => HttpResponse.json({ message: 'telephone invalid' }, { status: 400 })));
    await expect(requestJson('/x', z.unknown(), { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'telephone invalid',
    });
  });

  it('combines ProblemDetail detail with schemaValidationErrors', async () => {
    server.use(
      http.post(`${API}/x`, () =>
        HttpResponse.json(
          {
            title: 'Bad Request',
            status: 400,
            detail: 'Validation failed',
            schemaValidationErrors: [{ message: "[Path '/telephone'] too long" }],
          },
          { status: 400 },
        ),
      ),
    );
    await expect(requestJson('/x', z.unknown(), { method: 'POST', body: {} })).rejects.toMatchObject({
      message: "Validation failed: [Path '/telephone'] too long",
    });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    server.use(http.get(`${API}/x`, () => new HttpResponse('boom', { status: 500 })));
    await expect(requestJson('/x', z.unknown())).rejects.toMatchObject({ status: 500, message: 'Request failed (500)' });
  });

  it('rejects responses that violate the contract', async () => {
    server.use(http.get(`${API}/x`, () => HttpResponse.json({ a: 'not a number' })));
    await expect(requestJson('/x', z.object({ a: z.number() }))).rejects.toBeInstanceOf(ApiError);
  });

  it('reports network failures as status 0', async () => {
    server.use(http.get(`${API}/x`, () => HttpResponse.error()));
    await expect(requestJson('/x', z.unknown())).rejects.toMatchObject({ status: 0 });
  });
});
