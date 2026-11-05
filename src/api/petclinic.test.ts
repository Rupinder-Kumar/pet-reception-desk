import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { API } from '../test/handlers';
import { searchOwners } from './petclinic';

describe('searchOwners', () => {
  it('returns everyone for an empty term', async () => {
    expect(await searchOwners('  ')).toHaveLength(2);
  });

  it('uses the server-side lastName filter for a single word', async () => {
    let requested = '';
    server.use(
      http.get(`${API}/owners`, ({ request }) => {
        requested = request.url;
        return HttpResponse.json([]);
      }),
    );
    await searchOwners('Dav');
    expect(requested).toContain('lastName=Dav');
  });

  it('finds an owner by phone digits via the client-side workaround', async () => {
    const result = await searchOwners('608-555-1749');
    expect(result.map((o) => o.lastName)).toEqual(['Davis']);
  });

  it('finds an owner by full name', async () => {
    const result = await searchOwners('george franklin');
    expect(result.map((o) => o.lastName)).toEqual(['Franklin']);
  });
});
