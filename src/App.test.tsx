/**
 * Workflow-level tests: drive the real UI against the MSW fake backend, the way a receptionist would.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderApp } from './test/renderApp';
import { server } from './test/server';
import { API } from './test/handlers';

describe('Reception desk workflow', () => {
  it('finds an owner, opens a pet and registers a visit without leaving the screen', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(await screen.findByLabelText(/search owners/i), 'Fran');
    await waitFor(() => {
      const list = screen.getByRole('list', { name: /search results/i });
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    });
    await user.click(screen.getByRole('button', { name: /franklin, george/i }));

    expect(await screen.findByText('110 W. Liberty St.')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /leo/i }));
    expect(await screen.findByText('Rabies shot')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/description/i), 'Annual checkup');
    await user.click(screen.getByRole('button', { name: /register visit/i }));

    expect(await screen.findByText('Annual checkup')).toBeInTheDocument();
    expect(await screen.findByText(/visit registered/i)).toBeInTheDocument();
    // Search results are still visible: no navigation away from the working context.
    expect(screen.getByRole('list', { name: /search results/i })).toBeInTheDocument();
  });

  it('restores owner and pet from the URL (deep link / refresh)', async () => {
    renderApp('/owners/1/pets/1');
    expect(await screen.findByText('Rabies shot')).toBeInTheDocument();
  });

  it('creates a new owner when none exists and selects them', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(await screen.findByLabelText(/search owners/i), 'Zed');
    expect(await screen.findByText(/no owners found/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /new owner/i }));
    const dialog = await screen.findByRole('dialog', { name: /new owner/i });
    await user.type(within(dialog).getByLabelText(/first name/i), 'Zed');
    await user.type(within(dialog).getByLabelText(/last name/i), 'Zeta');
    await user.type(within(dialog).getByLabelText(/address/i), '1 Main St');
    await user.type(within(dialog).getByLabelText(/city/i), 'Austin');
    await user.type(within(dialog).getByLabelText(/telephone/i), '5125550000');
    await user.click(within(dialog).getByRole('button', { name: /save owner/i }));

    expect(await screen.findByRole('heading', { name: 'Zed Zeta' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows validation errors and does not call the API for an invalid owner', async () => {
    const user = userEvent.setup();
    let posted = false;
    server.use(http.post(`${API}/owners`, () => ((posted = true), HttpResponse.json({}, { status: 201 }))));
    renderApp();

    await user.click(await screen.findByRole('button', { name: /new owner/i }));
    await user.click(screen.getByRole('button', { name: /save owner/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('adds a pet to an existing owner and selects it', async () => {
    const user = userEvent.setup();
    renderApp('/owners/2');

    await user.click(await screen.findByRole('button', { name: /add pet/i }));
    const dialog = await screen.findByRole('dialog', { name: /add pet/i });
    await user.type(within(dialog).getByLabelText(/name/i), 'Rex');
    await user.type(within(dialog).getByLabelText(/birth date/i), '2020-02-02');
    await user.selectOptions(await within(dialog).findByLabelText(/type/i), 'dog');
    await user.click(within(dialog).getByRole('button', { name: /save pet/i }));

    expect(await screen.findByRole('heading', { name: 'Rex' })).toBeInTheDocument();
  });

  it('edits owner details and reflects them immediately', async () => {
    const user = userEvent.setup();
    renderApp('/owners/1');

    await user.click(await screen.findByRole('button', { name: /edit owner/i }));
    const dialog = await screen.findByRole('dialog', { name: /edit owner/i });
    const city = within(dialog).getByLabelText(/city/i);
    await user.clear(city);
    await user.type(city, 'Chicago');
    await user.click(within(dialog).getByRole('button', { name: /save owner/i }));

    expect(await screen.findByText('Chicago')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits a pet and shows the new name immediately', async () => {
    const user = userEvent.setup();
    renderApp('/owners/1/pets/1');

    await user.click(await screen.findByRole('button', { name: /edit pet/i }));
    const dialog = await screen.findByRole('dialog', { name: /edit leo/i });
    const name = within(dialog).getByLabelText(/name/i);
    await user.clear(name);
    await user.type(name, 'Leonard');
    await user.click(within(dialog).getByRole('button', { name: /save pet/i }));

    expect(await screen.findByRole('heading', { name: 'Leonard' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows an error when the owner list cannot be loaded and recovers on Retry', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${API}/owners`, () => HttpResponse.json({ detail: 'Database unavailable' }, { status: 500 }), { once: true }));
    renderApp();

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByRole('button', { name: /franklin, george/i })).toBeInTheDocument();
  });

  it('surfaces a server error from visit registration and keeps the typed text', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${API}/owners/1/pets/1/visits`, () => HttpResponse.json({ message: 'Visit rejected' }, { status: 400 })));
    renderApp('/owners/1/pets/1');

    const box = await screen.findByLabelText(/description/i);
    await user.type(box, 'Vaccination');
    await user.click(screen.getByRole('button', { name: /register visit/i }));

    expect(await screen.findByText('Visit rejected')).toBeInTheDocument();
    expect(box).toHaveValue('Vaccination');
    // The optimistic history entry was rolled back.
    expect(screen.queryByText('Vaccination')).not.toBeInTheDocument();
  });

  it('shows an error with retry when the owner cannot be loaded', async () => {
    server.use(http.get(`${API}/owners/1`, () => HttpResponse.json({ message: 'Not found' }, { status: 404 })));
    renderApp('/owners/1');
    expect(await screen.findAllByText('Not found')).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /retry/i }).length).toBeGreaterThan(0);
  });

  it('rejects a pet id that does not belong to the owner', async () => {
    renderApp('/owners/2/pets/1');
    expect(await screen.findByText(/does not belong to the selected owner/i)).toBeInTheDocument();
  });
});
