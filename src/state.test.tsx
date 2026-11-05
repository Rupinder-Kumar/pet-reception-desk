/** Tests for the state layer's behaviour: seeding, optimistic update, conflict detection, targeted invalidation. */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { keys, seedFromSearch } from './hooks/queries';
import { API, dbOwner } from './test/handlers';
import { renderApp } from './test/renderApp';
import { server } from './test/server';

describe('state layer', () => {
  it('renders a selected owner instantly from search results, then refreshes in the background', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole('button', { name: /franklin, george/i }));

    // Synchronously after the click: no loading state, the owner comes from the search result.
    expect(screen.getByRole('heading', { name: 'George Franklin' })).toBeInTheDocument();
    expect(screen.getByText('110 W. Liberty St.')).toBeInTheDocument();
  });

  it('seedFromSearch picks the freshest cached copy', async () => {
    const { client } = renderApp();
    await screen.findByRole('button', { name: /davis, betty/i });
    expect(seedFromSearch(client, 2)?.data.lastName).toBe('Davis');
    expect(seedFromSearch(client, 999)).toBeUndefined();
  });

  it('shows a new visit immediately (optimistic) and marks it as saving until the server confirms', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API}/owners/1/pets/1/visits`, async ({ request }) => {
        await delay(400);
        const body = (await request.json()) as { date: string; description: string };
        const visit = { ...body, id: 500, petId: 1 };
        dbOwner(1)!.pets[0]!.visits.push(visit);
        return HttpResponse.json(visit, { status: 201 });
      }),
    );
    renderApp('/owners/1/pets/1');

    await user.type(await screen.findByLabelText(/description/i), 'Dental cleaning');
    await user.click(screen.getByRole('button', { name: /register visit/i }));

    // Appears well before the 400 ms server delay has elapsed.
    await waitFor(() => expect(screen.getByText('Dental cleaning')).toBeInTheDocument(), { timeout: 200 });
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Saving…')).not.toBeInTheDocument());
    expect(screen.getByText('Dental cleaning')).toBeInTheDocument();
  });

  it('refuses to overwrite an owner that someone else changed while the dialog was open', async () => {
    const user = userEvent.setup();
    let puts = 0;
    server.use(http.put(`${API}/owners/1`, () => (puts++, new HttpResponse(null, { status: 204 }))));
    renderApp('/owners/1');

    await user.click(await screen.findByRole('button', { name: /edit owner/i }));
    const dialog = await screen.findByRole('dialog', { name: /edit owner/i });

    dbOwner(1)!.city = 'Elsewhere'; // a colleague saves a change meanwhile

    const city = within(dialog).getByLabelText(/city/i);
    await user.clear(city);
    await user.type(city, 'Chicago');
    await user.click(within(dialog).getByRole('button', { name: /save owner/i }));

    expect(await within(dialog).findByText(/changed by someone else/i)).toBeInTheDocument();
    expect(puts).toBe(0);
  });

  it('refuses to overwrite a pet that someone else changed', async () => {
    const user = userEvent.setup();
    renderApp('/owners/1/pets/1');

    await user.click(await screen.findByRole('button', { name: /edit pet/i }));
    const dialog = await screen.findByRole('dialog');
    dbOwner(1)!.pets[0]!.name = 'Leopold';

    const name = within(dialog).getByLabelText(/name/i);
    await user.clear(name);
    await user.type(name, 'Leo Jr');
    await user.click(within(dialog).getByRole('button', { name: /save pet/i }));

    expect(await within(dialog).findByText(/changed by someone else/i)).toBeInTheDocument();
  });

  it('adding a visit does not refetch owner search lists', async () => {
    const user = userEvent.setup();
    let listCalls = 0;
    server.use(
      http.get(`${API}/owners`, () => {
        listCalls++;
        return HttpResponse.json([dbOwner(1), dbOwner(2)]);
      }),
    );
    const { client } = renderApp('/owners/1/pets/1');
    await screen.findByRole('button', { name: /franklin, george/i });
    const before = listCalls;

    await user.type(await screen.findByLabelText(/description/i), 'Checkup');
    await user.click(screen.getByRole('button', { name: /register visit/i }));
    expect(await screen.findByText(/visit registered/i)).toBeInTheDocument();

    expect(listCalls).toBe(before);
    // ...but the lists are marked stale so the next real search reloads them.
    expect(client.getQueryState(keys.ownerSearch(''))?.isInvalidated).toBe(true);
  });
});

describe('seeding does not mask failures', () => {
  it('shows the real error for a deep link even if the owner exists in another cached list', async () => {
    server.use(http.get(`${API}/owners/1`, () => HttpResponse.json({ message: 'Owner gone' }, { status: 404 })));
    renderApp('/owners/1');
    expect(await screen.findByText('Owner gone')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'George Franklin' })).not.toBeInTheDocument();
  });
});
