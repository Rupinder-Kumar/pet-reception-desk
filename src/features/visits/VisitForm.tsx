import { Button, Group, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { visitFormSchema } from '../../api/forms';
import type { VisitInput } from '../../api/forms';
import { ErrorBox } from '../../components/QueryState';
import { useAddVisit } from '../../hooks/queries';
import { todayISO } from '../../lib/date';

interface Props {
  ownerId: number;
  petId: number;
}

/**
 * Inline form (not a dialog): date defaults to today; success resets the description for the next entry.
 * The parent mounts this under `key={ownerId-petId}` (see Workspace), so switching pets resets all form state.
 */
export function VisitForm({ ownerId, petId }: Props) {
  const add = useAddVisit(ownerId, petId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VisitInput>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: { date: todayISO(), description: '' },
  });

  const onSubmit = async (values: VisitInput) => {
    try {
      await add.mutateAsync({ ...values, description: values.description.trim() });
      reset({ date: values.date, description: '' }); // only on success: keep the text if the save failed
    } catch {
      // Rendered from `add.error`; see OwnerForm for why this is swallowed.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack gap="sm">
        <TextInput label="Visit date" withAsterisk type="date" error={errors.date?.message} {...register('date')} />
        <Textarea label="Description" withAsterisk rows={3} error={errors.description?.message} {...register('description')} />
        {add.isError && <ErrorBox error={add.error} />}
        <Group justify="space-between">
          {add.isSuccess ? (
            <Text role="status" size="sm" c="teal">
              Visit registered.
            </Text>
          ) : (
            <span />
          )}
          <Button type="submit" loading={add.isPending}>
            Register visit
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
