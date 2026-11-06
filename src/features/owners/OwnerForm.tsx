import { useState } from 'react';
import { Button, Group, Stack, TextInput } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ownerFormSchema } from '../../api/forms';
import type { OwnerInput } from '../../api/forms';
import type { Owner } from '../../api/schemas';
import { Dialog } from '../../components/Dialog';
import { ErrorBox } from '../../components/QueryState';
import { useCreateOwner, useUpdateOwner } from '../../hooks/queries';

interface Props {
  /** Present -> edit mode; absent -> create mode. */
  owner?: Owner;
  onClose: () => void;
  /** Called with the saved owner's id (create) or the edited owner's id (edit). */
  onSaved: (ownerId: number) => void;
}

/** Create / edit owner in a dialog so the receptionist keeps the surrounding context visible. */
export function OwnerForm({ owner, onClose, onSaved }: Props) {
  // Snapshot at open time: the conflict check compares the server copy against what the user started from,
  // not against the live cache (which may refresh while the dialog is open).
  const [baseline] = useState(owner);
  const create = useCreateOwner();
  const update = useUpdateOwner(owner?.id ?? -1, baseline);
  const mutation = owner ? update : create;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OwnerInput>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: owner
      ? { firstName: owner.firstName, lastName: owner.lastName, address: owner.address, city: owner.city, telephone: owner.telephone }
      : { firstName: '', lastName: '', address: '', city: '', telephone: '' },
  });

  const onSubmit = async (values: OwnerInput) => {
    try {
      if (owner) {
        await update.mutateAsync(values);
        onSaved(owner.id);
      } else {
        const created = await create.mutateAsync(values);
        onSaved(created.id);
      }
    } catch {
      // Intentionally empty: the failure is rendered from `mutation.error` below; rethrowing would
      // surface as an unhandled promise rejection from handleSubmit.
    }
  };

  return (
    <Dialog title={owner ? 'Edit owner' : 'New owner'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="sm">
          <Group grow align="flex-start">
            <TextInput
              label="First name"
              withAsterisk
              autoComplete="off"
              data-autofocus
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <TextInput label="Last name" withAsterisk autoComplete="off" error={errors.lastName?.message} {...register('lastName')} />
          </Group>
          <TextInput label="Address" withAsterisk autoComplete="off" error={errors.address?.message} {...register('address')} />
          <Group grow align="flex-start">
            <TextInput label="City" withAsterisk autoComplete="off" error={errors.city?.message} {...register('city')} />
            <TextInput
              label="Telephone"
              withAsterisk
              inputMode="numeric"
              autoComplete="off"
              error={errors.telephone?.message}
              {...register('telephone')}
            />
          </Group>
          {mutation.isError && <ErrorBox error={mutation.error} />}
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Save owner
            </Button>
          </Group>
        </Stack>
      </form>
    </Dialog>
  );
}
