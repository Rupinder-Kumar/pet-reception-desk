import { Button, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';

/** Light/dark switch. Defaults to the OS preference; the choice is persisted by Mantine. */
export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');
  return (
    <Button variant="subtle" size="xs" onClick={() => setColorScheme(scheme === 'dark' ? 'light' : 'dark')}>
      {scheme === 'dark' ? 'Light mode' : 'Dark mode'}
    </Button>
  );
}
