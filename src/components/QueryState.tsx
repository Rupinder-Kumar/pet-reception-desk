import { Alert, Button, Group, Loader, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { ApiError } from '../api/http';

/** Human-readable text for any thrown value. */
export function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function Loading({ label }: { label: string }) {
  return (
    <Group gap="xs" role="status">
      <Loader size="xs" />
      <Text size="sm" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}

/** Mantine's Alert has role="alert", so screen readers announce failures. */
export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />}>
      <Text size="sm">{errorText(error)}</Text>
      {onRetry && (
        <Button mt="xs" size="compact-sm" variant="light" color="red" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Alert>
  );
}
