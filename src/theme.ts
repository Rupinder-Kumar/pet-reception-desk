import { createTheme } from '@mantine/core';

/** Single place for visual identity. Components use theme tokens (colors, radius, spacing), never raw values. */
export const theme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  headings: { fontWeight: '650' },
});
