import { useState } from 'react';
import { Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconMapPin, IconPencil, IconPhone, IconPlus } from '@tabler/icons-react';
import { ErrorBox, Loading } from '../../components/QueryState';
import { SelectableRow } from '../../components/SelectableRow';
import { useOwner } from '../../hooks/queries';
import { formatAge } from '../../lib/date';
import { petEmoji } from '../../lib/petEmoji';
import { PetForm } from '../pets/PetForm';
import { OwnerForm } from './OwnerForm';

interface Props {
  ownerId: number;
  selectedPetId: number | undefined;
  onSelectPet: (petId: number) => void;
}

/** Middle column: owner details and their pets. */
export function OwnerPanel({ ownerId, selectedPetId, onSelectPet }: Props) {
  const { data: owner, isLoading, isError, error, refetch } = useOwner(ownerId);
  const [editing, setEditing] = useState(false);
  const [addingPet, setAddingPet] = useState(false);

  if (isLoading) return <Loading label="Loading owner…" />;
  if (isError) return <ErrorBox error={error} onRetry={() => void refetch()} />;
  if (!owner) return null;

  return (
    <Paper withBorder p="md" component="section" aria-label="Owner">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Title order={2} size="h3">
            {owner.firstName} {owner.lastName}
          </Title>
          <Button variant="light" size="compact-md" leftSection={<IconPencil size={14} />} onClick={() => setEditing(true)}>
            Edit owner
          </Button>
        </Group>

        <Stack gap={6}>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <IconMapPin size={16} aria-hidden style={{ marginTop: 3 }} />
            <div>
              <Text>{owner.address}</Text>
              <Text>{owner.city}</Text>
            </div>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <IconPhone size={16} aria-hidden />
            <Text>{owner.telephone}</Text>
          </Group>
        </Stack>

        <Group justify="space-between">
          <Title order={3} size="h5">
            Pets ({owner.pets.length})
          </Title>
          <Button variant="light" size="compact-md" leftSection={<IconPlus size={14} />} onClick={() => setAddingPet(true)}>
            Add pet
          </Button>
        </Group>
        {owner.pets.length === 0 ? (
          <Text size="sm" c="dimmed">
            This owner has no pets yet.
          </Text>
        ) : (
          <Stack component="ul" gap="xs" m={0} p={0} style={{ listStyle: 'none' }} aria-label="Pets">
            {owner.pets.map((p) => (
              <li key={p.id}>
                <SelectableRow
                  selected={p.id === selectedPetId}
                  onClick={() => onSelectPet(p.id)}
                  leading={<span style={{ fontSize: 28, lineHeight: 1 }}>{petEmoji(p.type.name)}</span>}
                  title={p.name}
                  subtitle={`${p.type.name} · ${formatAge(p.birthDate)} · ${p.visits.length} visit${p.visits.length === 1 ? '' : 's'}`}
                />
              </li>
            ))}
          </Stack>
        )}
      </Stack>

      {editing && <OwnerForm owner={owner} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />}
      {addingPet && (
        <PetForm
          ownerId={owner.id}
          onClose={() => setAddingPet(false)}
          onSaved={(petId) => {
            setAddingPet(false);
            onSelectPet(petId);
          }}
        />
      )}
    </Paper>
  );
}
