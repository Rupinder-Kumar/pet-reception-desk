import { useState } from 'react';
import { Button, Group, NativeSelect, Stack, TextInput } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { petFormSchema } from '../../api/forms';
import type { PetFormValues } from '../../api/forms';
import type { Pet } from '../../api/schemas';
import { Dialog } from '../../components/Dialog';
import { ErrorBox, Loading } from '../../components/QueryState';
import { useCreatePet, usePetTypes, useUpdatePet } from '../../hooks/queries';
import { todayISO } from '../../lib/date';

interface Props {
  ownerId: number;
  /** Present -> edit mode; absent -> add a new pet to the owner. */
  pet?: Pet;
  onClose: () => void;
  onSaved: (petId: number) => void;
}

/** Add / edit pet. The pet type list comes from the API (reference data), never hard-coded. */
export function PetForm({ ownerId, pet, onClose, onSaved }: Props) {
  const [baseline] = useState(pet); // snapshot for the conflict check, see OwnerForm
  const types = usePetTypes();
  const create = useCreatePet(ownerId);
  const update = useUpdatePet(ownerId, pet?.id ?? -1, baseline);
  const mutation = pet ? update : create;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PetFormValues>({
    resolver: zodResolver(petFormSchema),
    defaultValues: pet
      ? { name: pet.name, birthDate: pet.birthDate, typeId: String(pet.type.id) }
      : { name: '', birthDate: '', typeId: '' },
  });

  const onSubmit = async (values: PetFormValues) => {
    const type = types.data?.find((t) => String(t.id) === values.typeId);
    if (!type) return; // unreachable: the select only offers loaded types
    const payload = { name: values.name.trim(), birthDate: values.birthDate, type };
    try {
      if (pet) {
        await update.mutateAsync(payload);
        onSaved(pet.id);
      } else {
        const created = await create.mutateAsync(payload);
        onSaved(created.id);
      }
    } catch {
      // Rendered from `mutation.error`; see OwnerForm for why this is swallowed.
    }
  };

  return (
    <Dialog title={pet ? `Edit ${pet.name}` : 'Add pet'} onClose={onClose}>
      {types.isLoading && <Loading label="Loading pet types…" />}
      {types.isError && <ErrorBox error={types.error} onRetry={() => void types.refetch()} />}
      {types.data && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack gap="sm">
            <TextInput label="Name" withAsterisk autoComplete="off" data-autofocus error={errors.name?.message} {...register('name')} />
            <TextInput
              label="Birth date"
              withAsterisk
              type="date"
              max={todayISO()}
              error={errors.birthDate?.message}
              {...register('birthDate')}
            />
            <NativeSelect
              label="Type"
              withAsterisk
              data={[{ value: '', label: 'Select…' }, ...types.data.map((t) => ({ value: String(t.id), label: t.name }))]}
              error={errors.typeId?.message}
              {...register('typeId')}
            />
            {mutation.isError && <ErrorBox error={mutation.error} />}
            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Save pet
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Dialog>
  );
}
