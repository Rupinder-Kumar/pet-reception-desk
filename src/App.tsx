import { ActionIcon, AppShell, Group, ThemeIcon, Title, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconPaw, IconSun } from '@tabler/icons-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { Workspace } from './Workspace';

/** Fresh client per call so tests are isolated. Writes are never retried automatically (not idempotent). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false }, mutations: { retry: false } },
  });
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true });
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={computed === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setColorScheme(computed === 'dark' ? 'light' : 'dark')}
    >
      {computed === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}

/**
 * Providers + shell + routes. The router (BrowserRouter / MemoryRouter) and MantineProvider are supplied
 * by the caller so tests can configure them (`env="test"` disables transitions and portals).
 */
export function App({ client }: { client: QueryClient }) {
  return (
    <QueryClientProvider client={client}>
      <AppShell header={{ height: 56 }} padding="md">
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group gap="xs">
              <ThemeIcon variant="light" size="lg">
                <IconPaw size={20} />
              </ThemeIcon>
              <Title order={1} size="h4">
                Reception Desk
              </Title>
            </Group>
            <ColorSchemeToggle />
          </Group>
        </AppShell.Header>
        <AppShell.Main>
          <Routes>
            <Route path="*" element={<Workspace />} />
          </Routes>
        </AppShell.Main>
      </AppShell>
    </QueryClientProvider>
  );
}
