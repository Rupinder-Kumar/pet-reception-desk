import { useState } from 'react';
import { Avatar, Button, Loader, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { ErrorBox, Loading } from '../../components/QueryState';
import { SelectableRow } from '../../components/SelectableRow';
import { useOwnerSearch } from '../../hooks/queries';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { OwnerForm } from './OwnerForm';

interface Props {
  term: string;
  onTermChange: (term: string) => void;
  selectedOwnerId: number | undefined;
  onSelect: (ownerId: number) => void;
}

/** Left column: find an owner (surname / full name / phone) or create a new one. */
export function OwnerSearch({ term, onTermChange, selectedOwnerId, onSelect }: Props) {
  const [creating, setCreating] = useState(false);
  const debounced = useDebouncedValue(term);
  const { data, isLoading, isFetching, isError, error, refetch } = useOwnerSearch(debounced);

  return (
    <Paper withBorder p="md" component="section" aria-label="Find owner">
      <Stack gap="sm">
        <Title order={2} size="h4">
          Find owner
        </Title>
        <TextInput
          aria-label="Search owners by surname, full name or phone"
          placeholder="Surname, full name or phone"
          type="search"
          autoFocus
          value={term}
          onChange={(e) => onTermChange(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          rightSection={isFetching && !isLoading ? <Loader size="xs" /> : null}
        />
        <Button fullWidth leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
          New owner
        </Button>

        {isLoading && <Loading label="Searching…" />}
        {isError && <ErrorBox error={error} onRetry={() => void refetch()} />}
        {data && data.length === 0 && (
          <Text size="sm" c="dimmed">
            No owners found{debounced.trim() ? <> for “{debounced.trim()}”</> : null}. Use “New owner” to register them.
          </Text>
        )}
        {data && data.length > 0 && (
          <Stack component="ul" gap="xs" m={0} p={0} style={{ listStyle: 'none' }} aria-label="Search results">
            {data.map((o) => (
              <li key={o.id}>
                <SelectableRow
                  selected={o.id === selectedOwnerId}
                  onClick={() => onSelect(o.id)}
                  leading={
                    <Avatar color="teal" radius="xl">
                      {o.firstName.charAt(0)}
                      {o.lastName.charAt(0)}
                    </Avatar>
                  }
                  title={`${o.lastName}, ${o.firstName}`}
                  subtitle={`${o.city} · ${o.telephone}`}
                />
              </li>
            ))}
          </Stack>
        )}
      </Stack>

      {creating && (
        <OwnerForm
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            onSelect(id);
          }}
        />
      )}
    </Paper>
  );
}
