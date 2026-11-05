import { Group, Text, UnstyledButton } from '@mantine/core';
import type { ReactNode } from 'react';

interface Props {
  selected: boolean;
  onClick: () => void;
  /** Decorative leading element (avatar / emoji); hidden from assistive tech. */
  leading: ReactNode;
  title: string;
  subtitle: string;
}

/** Full-width selectable list entry (a real <button>, so keyboard and screen readers work). */
export function SelectableRow({ selected, onClick, leading, title, subtitle }: Props) {
  return (
    <UnstyledButton className="row" w="100%" p="sm" aria-current={selected ? 'true' : undefined} onClick={onClick}>
      <Group wrap="nowrap" gap="sm">
        <span aria-hidden>{leading}</span>
        <div style={{ minWidth: 0 }}>
          <Text fw={600} truncate>
            {title}
          </Text>
          <Text size="sm" c="dimmed" truncate>
            {subtitle}
          </Text>
        </div>
      </Group>
    </UnstyledButton>
  );
}
