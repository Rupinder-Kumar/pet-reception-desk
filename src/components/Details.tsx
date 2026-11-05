import { Box, Text } from '@mantine/core';

/** Semantic `<dl>` of label/value pairs. Labels are dimmed, values are regular text. */
export function Details({ items }: { items: ReadonlyArray<readonly [label: string, value: string]> }) {
  return (
    <Box component="dl" m={0} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 16, rowGap: 4 }}>
      {items.map(([label, value]) => (
        <Box key={label} style={{ display: 'contents' }}>
          <Text component="dt" c="dimmed" size="sm">
            {label}
          </Text>
          <Text component="dd" m={0} size="sm">
            {value}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
