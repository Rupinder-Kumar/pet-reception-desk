import { useDeferredValue, useMemo, useState } from 'react';
import { Avatar, Button, Loader, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { ErrorBox, Loading } from '../../components/QueryState';
import { SelectableRow } from '../../components/SelectableRow';
import { useOwners } from '../../hooks/queries';
import { buildOwnerIndex, searchOwnerIndex } from '../../lib/ownerSearch';
import { OwnerForm } from './OwnerForm';

interface Props {
  term: string;
  onTermChange: (term: string) => void;
  selectedOwnerId: number | undefined;
  onSelect: (ownerId: number) => void;
}

/** Rendering cap: keeps the DOM small for big clinics; the receptionist narrows the search instead of scrolling. */
const MAX_RESULTS = 50;

/**
 * Left column: find an owner or create a new one. The owner list is fetched once and searched locally
 * (name, phone, city, pet name), so results update on every keystroke with no request.
 */
export function OwnerSearch({ term, onTermChange, selectedOwnerId, onSelect }: Props) {
  const [creating, setCreating] = useState(false);
  const { data: owners, isLoading, isFetching, isError, error, refetch } = useOwners();
  const index = useMemo(() => buildOwnerIndex(owners ?? []), [owners]);
  const deferredTerm = useDeferredValue(term); // keeps typing responsive even with a large list
  const results = useMemo(() => searchOwnerIndex(index, deferredTerm), [index, deferredTerm]);
  const shown = results.slice(0, MAX_RESULTS);

  return (
    <Paper withBorder p="md" component="section" aria-label="Find owner">
      <Stack gap="sm">
        <Title order={2} size="h4">
          Find owner
        </Title>
        <TextInput
          aria-label="Search owners by name, phone, city or pet"
          placeholder="Name, phone, city or pet"
          type="search"
          autoFocus // eslint-disable-line jsx-a11y/no-autofocus -- intentional: this workstation screen exists to search; the cursor must start here
          value={term}
          onChange={(e) => onTermChange(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          rightSection={isFetching && !isLoading ? <Loader size="xs" aria-label="Refreshing owner list" /> : null}
        />
        <Button fullWidth leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
          New owner
        </Button>

        {isLoading && <Loading label="Searching…" />}
        {isError && <ErrorBox error={error} onRetry={() => void refetch()} />}
        {owners && results.length === 0 && (
          <Text size="sm" c="dimmed">
            No owners found{term.trim() ? <> for “{term.trim()}”</> : null}. Use “New owner” to register them.
          </Text>
        )}
        {owners && results.length > 0 && (
          <Text size="xs" c="dimmed" aria-live="polite">
            {results.length === owners.length ? `${owners.length} owners` : `${results.length} of ${owners.length} owners`}
            {results.length > MAX_RESULTS ? ` · showing first ${MAX_RESULTS}, type more to narrow` : ''}
          </Text>
        )}
        {owners && shown.length > 0 && (
          <Stack component="ul" gap="xs" m={0} p={0} style={{ listStyle: 'none' }} aria-label="Search results">
            {shown.map((o) => (
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
