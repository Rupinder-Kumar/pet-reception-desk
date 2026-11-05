import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App, createQueryClient } from '../App';
import { theme } from '../theme';

/** Renders the full app with an isolated query cache at the given URL. `env="test"` disables transitions/portals. */
export function renderApp(initialPath = '/') {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  const utils = render(
    <MantineProvider theme={theme} env="test">
      <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App client={client} />
      </MemoryRouter>
    </MantineProvider>,
  );
  return { ...utils, client };
}
