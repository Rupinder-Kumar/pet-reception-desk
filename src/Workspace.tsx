import { useState } from 'react';
import { Center, Grid, Stack, Text } from '@mantine/core';
import { IconPaw, IconUserSearch } from '@tabler/icons-react';
import { useMatch, useNavigate } from 'react-router-dom';
import { OwnerPanel } from './features/owners/OwnerPanel';
import { OwnerSearch } from './features/owners/OwnerSearch';
import { PetPanel } from './features/pets/PetPanel';
import { usePrimeOwner } from './hooks/queries';

/**
 * The single working screen. Three columns: search -> owner & pets -> pet & visits.
 * Selection lives in the URL (/owners/:ownerId/pets/:petId): refresh and back/forward work,
 * and a colleague can be sent a link. The search term is local UI state and survives selection changes.
 */
export function Workspace() {
  const navigate = useNavigate();
  const primeOwner = usePrimeOwner();
  const [term, setTerm] = useState('');
  const petMatch = useMatch('/owners/:ownerId/pets/:petId');
  const ownerMatch = useMatch('/owners/:ownerId');
  const params = petMatch?.params ?? ownerMatch?.params;
  const ownerId = toId(params?.ownerId);
  const petId = toId(petMatch?.params.petId);

  return (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
        <OwnerSearch term={term} onTermChange={setTerm} selectedOwnerId={ownerId} onSelect={(id) => {
            primeOwner(id); // instant render from the search result; refreshed in the background
            navigate(`/owners/${id}`);
          }}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 8, lg: 4 }}>
        {ownerId === undefined ? (
          <Placeholder icon={<IconUserSearch size={40} />} text="Search for an owner or register a new one to begin." />
        ) : (
          <OwnerPanel ownerId={ownerId} selectedPetId={petId} onSelectPet={(id) => navigate(`/owners/${ownerId}/pets/${id}`)} />
        )}
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 5 }}>
        {ownerId !== undefined && petId !== undefined ? (
          <PetPanel key={`${ownerId}-${petId}`} ownerId={ownerId} petId={petId} />
        ) : ownerId !== undefined ? (
          <Placeholder icon={<IconPaw size={40} />} text="Select a pet to see its visits." />
        ) : null}
      </Grid.Col>
    </Grid>
  );
}

function Placeholder({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Center mih={200}>
      <Stack align="center" gap="xs" c="dimmed">
        {icon}
        <Text size="sm">{text}</Text>
      </Stack>
    </Center>
  );
}

/** Route params are strings from user-controlled URLs: reject anything that is not a positive integer. */
function toId(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  return Number(value);
}
