import { http, HttpResponse } from 'msw';
import { API } from '../test/handlers';
import { server } from '../test/server';
import { listOwners } from './petclinic';

describe('listOwners', () => {
  it('fetches the unfiltered list in one request (search is local)', async () => {
    let calls = 0;
    let url = '';
    server.use(
      http.get(`${API}/owners`, ({ request }) => {
        calls++;
        url = request.url;
        return HttpResponse.json([]);
      }),
    );
    await listOwners();
    expect(calls).toBe(1);
    expect(url).not.toContain('lastName');
  });

  it('returns owners with their pets and visits parsed', async () => {
    const owners = await listOwners();
    expect(owners).toHaveLength(2);
    expect(owners[0]?.pets[0]?.visits[0]?.description).toBe('Rabies shot');
  });
});
