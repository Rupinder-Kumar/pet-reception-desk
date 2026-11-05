import { Group, Paper, Stack, Title } from '@mantine/core';
import type { ReactNode } from 'react';

interface PanelProps {
  /** Heading text; also used as the landmark's accessible name. */
  title: string;
  /** Optional action buttons shown on the right of the header. */
  actions?: ReactNode;
  children: ReactNode;
}

/** Bordered card used by all three columns, so they look and behave consistently. */
export function Panel({ title, actions, children }: PanelProps) {
  return (
    <Paper component="section" aria-label={title} withBorder shadow="xs" p="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Title order={2} size="h4">
            {title}
          </Title>
          {actions}
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}
