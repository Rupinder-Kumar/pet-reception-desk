import { Badge, Group, Text, Timeline } from '@mantine/core';
import type { Visit } from '../../api/schemas';
import { formatDate } from '../../lib/date';

/** Most recent visit first. ISO dates sort correctly as strings; id breaks ties for same-day visits. */
export function sortVisits(visits: readonly Visit[]): Visit[] {
  return [...visits].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

/** Visits with a negative id are optimistic entries not yet confirmed by the server. */
const isPending = (v: Visit) => v.id < 0;

export function VisitList({ visits }: { visits: readonly Visit[] }) {
  if (visits.length === 0)
    return (
      <Text size="sm" c="dimmed">
        No previous visits.
      </Text>
    );
  return (
    <Timeline bulletSize={14} lineWidth={2}>
      {sortVisits(visits).map((v) => (
        <Timeline.Item
          key={v.id}
          title={
            <Group gap="xs">
              <time dateTime={v.date}>{formatDate(v.date)}</time>
              {isPending(v) && (
                <Badge size="xs" variant="light" color="gray">
                  Saving…
                </Badge>
              )}
            </Group>
          }
        >
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {v.description}
          </Text>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}
