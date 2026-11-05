import { useState } from 'react';
import { Badge, Button, Divider, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { ErrorBox, Loading } from '../../components/QueryState';
import { useOwner } from '../../hooks/queries';
import { formatAge, formatDate } from '../../lib/date';
import { petEmoji } from '../../lib/petEmoji';
import { VisitForm } from '../visits/VisitForm';
import { VisitList } from '../visits/VisitList';
import { PetForm } from './PetForm';

interface Props {
  ownerId: number;
  petId: number;
}

/**
 * Right column: pet details, the "register visit" form (always visible, because it is the most frequent
 * action during a conversation) and the visit history.
 * The pet is *derived* from the cached owner, so there is no duplicated pet state to keep in sync.
 */
export function PetPanel({ ownerId, petId }: Props) {
  const { data: owner, isLoading, isError, error, refetch } = useOwner(ownerId);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <Loading label="Loading pet…" />;
  if (isError) return <ErrorBox error={error} onRetry={() => void refetch()} />;
  const pet = owner?.pets.find((p) => p.id === petId);
  if (!owner || !pet) return <Text role="alert">This pet does not belong to the selected owner.</Text>;

  return (
    <Paper withBorder p="md" component="section" aria-label="Pet">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <span aria-hidden style={{ fontSize: 34, lineHeight: 1 }}>
              {petEmoji(pet.type.name)}
            </span>
            <div>
              <Title order={2} size="h3">
                {pet.name}
              </Title>
              <Group gap="xs">
                <Badge variant="light">{pet.type.name}</Badge>
                <Text size="sm" c="dimmed">
                  Born {formatDate(pet.birthDate)} · {formatAge(pet.birthDate)}
                </Text>
              </Group>
            </div>
          </Group>
          <Button variant="light" size="compact-md" leftSection={<IconPencil size={14} />} onClick={() => setEditing(true)}>
            Edit pet
          </Button>
        </Group>

        <Divider label="Register visit" labelPosition="left" />
        <VisitForm ownerId={ownerId} petId={petId} />

        <Divider label={`Previous visits (${pet.visits.length})`} labelPosition="left" />
        <VisitList visits={pet.visits} />
      </Stack>

      {editing && <PetForm ownerId={ownerId} pet={pet} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />}
    </Paper>
  );
}
