const WORKDAY_NAMES = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

const berlinWeekdayTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

interface BerlinTimeParts {
  weekday: string;
  minutesSinceMidnight: number;
}

function toBerlinTimeParts(startsAt: string): BerlinTimeParts | null {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = berlinWeekdayTimeFormatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hour = Number.parseInt(parts.find((part) => part.type === 'hour')?.value ?? '', 10);
  const minute = Number.parseInt(parts.find((part) => part.type === 'minute')?.value ?? '', 10);

  if (!weekday || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  return {
    weekday,
    minutesSinceMidnight: hour * 60 + minute
  };
}

export function isBerlinWorkdayAtOrAfter(startsAt: string, cutoffMinutes: number): boolean {
  const parts = toBerlinTimeParts(startsAt);
  if (!parts) {
    return false;
  }

  return WORKDAY_NAMES.has(parts.weekday) && parts.minutesSinceMidnight >= cutoffMinutes;
}

export function isBerlinWorkday(startsAt: string): boolean {
  const parts = toBerlinTimeParts(startsAt);
  return parts ? WORKDAY_NAMES.has(parts.weekday) : false;
}

export function isBerlinAtOrAfter(startsAt: string, cutoffMinutes: number): boolean {
  const parts = toBerlinTimeParts(startsAt);
  return parts ? parts.minutesSinceMidnight >= cutoffMinutes : false;
}
