import type { DataCalendarEvent } from '../models/data-dashboard.models';

const ONE_HOUR_MS = 60 * 60 * 1000;

const berlinDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

export interface WorkoutCalendarConflict {
  kind: 'during' | 'near';
  eventTitle: string;
}

function toIsoDateKey(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function toWorkoutBerlinDateKey(startsAt: string): string | null {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return berlinDateKeyFormatter.format(date);
}

function toEpoch(value: string): number | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export function getWorkoutCalendarConflict(
  workoutStartsAt: string,
  calendarEvents: DataCalendarEvent[]
): WorkoutCalendarConflict | null {
  const workoutMs = toEpoch(workoutStartsAt);
  const workoutDateKey = toWorkoutBerlinDateKey(workoutStartsAt);
  if (workoutMs === null || !workoutDateKey) {
    return null;
  }

  let nearestConflict: WorkoutCalendarConflict | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const event of calendarEvents) {
    const title = event.title || 'Calendar event';

    if (event.allDay) {
      const startKey = toIsoDateKey(event.startsAt);
      const endExclusiveKey = toIsoDateKey(event.endsAt);
      if (!startKey || !endExclusiveKey) {
        continue;
      }

      if (workoutDateKey >= startKey && workoutDateKey < endExclusiveKey) {
        return { kind: 'during', eventTitle: title };
      }

      continue;
    }

    const startMs = toEpoch(event.startsAt);
    const endMs = toEpoch(event.endsAt);
    if (startMs === null || endMs === null) {
      continue;
    }

    const intervalStart = Math.min(startMs, endMs);
    const intervalEnd = Math.max(startMs, endMs);

    if (workoutMs >= intervalStart && workoutMs <= intervalEnd) {
      return { kind: 'during', eventTitle: title };
    }

    const distance = workoutMs < intervalStart ? intervalStart - workoutMs : workoutMs - intervalEnd;
    if (distance < ONE_HOUR_MS && distance < nearestDistance) {
      nearestDistance = distance;
      nearestConflict = { kind: 'near', eventTitle: title };
    }
  }

  return nearestConflict;
}
