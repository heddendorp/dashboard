import type { Beat81Event, Beat81EventsPayload } from '../../types';

const DEFAULT_BEAT81_API_BASE_URL = 'https://api.production.b81.io';
const DEFAULT_LANGUAGE = 'de';
const DEFAULT_LIMIT = 10;
const DEFAULT_SKIP = 0;
const DEFAULT_LOCATION_ID = 'b5d7aae0-cec0-45bd-a79f-a312635078c1';
const DEFAULT_TICKETS_LIMIT = 30;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

interface Beat81ApiImageVariant {
  url?: string;
}

interface Beat81ApiProfilePicture {
  small?: Beat81ApiImageVariant;
  medium?: Beat81ApiImageVariant;
  large?: Beat81ApiImageVariant;
  thumb?: Beat81ApiImageVariant;
}

interface Beat81ApiCoach {
  forename?: string;
  surname?: string;
  profile_picture?: Beat81ApiProfilePicture;
}

interface Beat81ApiType {
  name?: string;
}

interface Beat81ApiLocation {
  name?: string;
}

interface Beat81ApiEvent {
  id?: string | number;
  date_begin?: string;
  max_participants?: number;
  current_participants_count?: number;
  participants_count?: number;
  type?: Beat81ApiType;
  location?: Beat81ApiLocation;
  coach?: Beat81ApiCoach;
}

interface Beat81ApiEventsResponse {
  data?: Beat81ApiEvent[];
  total?: number;
}

interface Beat81ApiTicket {
  event?: Beat81ApiEvent;
}

interface Beat81ApiTicketsResponse {
  data?: Beat81ApiTicket[];
}

interface Beat81EventsOptions {
  dateBeginGte?: string;
  language?: string;
  limit?: number;
  skip?: number;
  locationId?: string;
  userId?: string;
}

interface BookedEventsResult {
  bookedItems: Beat81Event[];
  latestBookedStartsAt: number | null;
}

function resolveApiBaseUrl(): string {
  return process.env['BEAT81_API_BASE_URL']?.trim() || DEFAULT_BEAT81_API_BASE_URL;
}

function resolveLanguage(language: string | undefined): string {
  return language || process.env['BEAT81_ACCEPT_LANGUAGE']?.trim() || DEFAULT_LANGUAGE;
}

function resolveLimit(limit: number | undefined): number {
  if (typeof limit === 'number' && Number.isInteger(limit) && limit > 0) {
    return limit;
  }

  const envLimit = Number.parseInt(process.env['BEAT81_EVENTS_LIMIT'] ?? '', 10);
  return Number.isInteger(envLimit) && envLimit > 0 ? envLimit : DEFAULT_LIMIT;
}

function resolveSkip(skip: number | undefined): number {
  if (typeof skip === 'number' && Number.isInteger(skip) && skip >= 0) {
    return skip;
  }

  const envSkip = Number.parseInt(process.env['BEAT81_EVENTS_SKIP'] ?? '', 10);
  return Number.isInteger(envSkip) && envSkip >= 0 ? envSkip : DEFAULT_SKIP;
}

function resolveTicketsLimit(): number {
  const envLimit = Number.parseInt(process.env['BEAT81_TICKETS_LIMIT'] ?? '', 10);
  return Number.isInteger(envLimit) && envLimit > 0 ? envLimit : DEFAULT_TICKETS_LIMIT;
}

function resolveLocationId(locationId: string | undefined): string | undefined {
  return locationId || process.env['BEAT81_LOCATION_ID']?.trim() || DEFAULT_LOCATION_ID;
}

function resolveDateBeginGte(dateBeginGte: string | undefined): string {
  return dateBeginGte || process.env['BEAT81_DATE_BEGIN_GTE']?.trim() || new Date().toISOString();
}

function resolveToken(): string | undefined {
  const token = process.env['BEAT81_TOKEN']?.trim();
  return token ? token : undefined;
}

function resolveUserId(userId: string | undefined): string | undefined {
  const explicitUserId = userId?.trim();
  if (explicitUserId) {
    return explicitUserId;
  }

  const envUserId = process.env['BEAT81_USER_ID']?.trim();
  return envUserId ? envUserId : undefined;
}

function buildTrainerName(coach: Beat81ApiCoach | undefined): string | null {
  if (!coach) {
    return null;
  }

  const forename = coach.forename?.trim() ?? '';
  const surname = coach.surname?.trim() ?? '';
  return forename || surname || null;
}

function extractTrainerImageUrl(coach: Beat81ApiCoach | undefined): string | null {
  const profilePicture = coach?.profile_picture;
  return (
    profilePicture?.small?.url ||
    profilePicture?.thumb?.url ||
    profilePicture?.medium?.url ||
    profilePicture?.large?.url ||
    null
  );
}

function normalizeEvents(payload: unknown): { items: Beat81Event[]; sourceTotal: number | null } {
  const response = payload as Beat81ApiEventsResponse;
  const rawItems = Array.isArray(response.data)
    ? response.data
    : Array.isArray(payload)
      ? (payload as Beat81ApiEvent[])
      : [];

  const items: Beat81Event[] = rawItems.map((item, index) =>
    normalizeEvent(item, `idx-${index}`, false)
  );

  return {
    items,
    sourceTotal: typeof response.total === 'number' ? response.total : null
  };
}

function normalizeEvent(item: Beat81ApiEvent, fallbackId: string, isBooked: boolean): Beat81Event {
  return {
    id: String(item.id ?? fallbackId),
    title: item.type?.name?.trim() || 'Workout',
    startsAt: item.date_begin || '',
    location: item.location?.name?.trim() || 'Unknown location',
    isBooked,
    trainerName: buildTrainerName(item.coach),
    trainerImageUrl: extractTrainerImageUrl(item.coach),
    ...extractCapacityFields(item)
  };
}

function extractCapacityFields(item: Beat81ApiEvent): {
  maxParticipants: number | null;
  currentParticipants: number | null;
  openSpots: number | null;
} {
  const maxParticipants =
    typeof item.max_participants === 'number' ? item.max_participants : null;
  const currentParticipants =
    typeof item.current_participants_count === 'number'
      ? item.current_participants_count
      : typeof item.participants_count === 'number'
        ? item.participants_count
        : null;

  if (maxParticipants === null || currentParticipants === null) {
    return {
      maxParticipants,
      currentParticipants,
      openSpots: null
    };
  }

  return {
    maxParticipants,
    currentParticipants,
    openSpots: Math.max(maxParticipants - currentParticipants, 0)
  };
}

function toEpoch(value: string): number | null {
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) ? epoch : null;
}

function compareByBookingAndStart(left: Beat81Event, right: Beat81Event): number {
  if (left.isBooked !== right.isBooked) {
    return left.isBooked ? -1 : 1;
  }

  const leftEpoch = toEpoch(left.startsAt);
  const rightEpoch = toEpoch(right.startsAt);

  if (leftEpoch === null && rightEpoch === null) {
    return left.id.localeCompare(right.id);
  }

  if (leftEpoch === null) {
    return 1;
  }

  if (rightEpoch === null) {
    return -1;
  }

  return leftEpoch - rightEpoch;
}

async function fetchBookedEvents(
  token: string,
  language: string,
  dateBeginGte: string,
  userId: string
): Promise<BookedEventsResult> {
  const url = new URL('/api/tickets', resolveApiBaseUrl());
  url.searchParams.set('user_id', userId);
  url.searchParams.set('$sort[event_date_begin]', '1');
  url.searchParams.set('event_date_begin_gte', dateBeginGte);
  url.searchParams.set('status_ne', 'cancelled');
  url.searchParams.set('$limit', String(resolveTicketsLimit()));
  url.searchParams.set('$skip', '0');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': language,
      authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Beat81 tickets request failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const payload = (await response.json()) as Beat81ApiTicketsResponse;
  const rawTickets = Array.isArray(payload.data) ? payload.data : [];

  let latestBookedStartsAt: number | null = null;
  const bookedItems: Beat81Event[] = [];

  for (const [index, ticket] of rawTickets.entries()) {
    const event = ticket.event;
    if (!event) {
      continue;
    }

    const normalized = normalizeEvent(event, `ticket-${index}`, true);
    bookedItems.push(normalized);

    const startsAt = toEpoch(normalized.startsAt);
    if (startsAt !== null && (latestBookedStartsAt === null || startsAt > latestBookedStartsAt)) {
      latestBookedStartsAt = startsAt;
    }
  }

  return {
    bookedItems,
    latestBookedStartsAt
  };
}

function mergeEvents(
  events: Beat81Event[],
  bookedEvents: Beat81Event[],
  latestBookedStartsAt: number | null,
  finalLimit: number
): Beat81Event[] {
  const mergedById = new Map<string, Beat81Event>();

  for (const event of events) {
    mergedById.set(event.id, event);
  }

  for (const bookedEvent of bookedEvents) {
    const existing = mergedById.get(bookedEvent.id);
    if (existing) {
      mergedById.set(bookedEvent.id, {
        ...existing,
        ...bookedEvent,
        isBooked: true
      });
      continue;
    }

    mergedById.set(bookedEvent.id, bookedEvent);
  }

  const nextCandidateStartsAt =
    latestBookedStartsAt === null ? null : latestBookedStartsAt + TWO_DAYS_MS;

  const filtered = Array.from(mergedById.values()).filter((event) => {
    if (event.isBooked) {
      return true;
    }

    if (nextCandidateStartsAt === null) {
      return true;
    }

    const startsAt = toEpoch(event.startsAt);
    return startsAt !== null && startsAt >= nextCandidateStartsAt;
  });

  return filtered.sort(compareByBookingAndStart).slice(0, finalLimit);
}

export async function fetchBeat81Events(options: Beat81EventsOptions = {}): Promise<Beat81EventsPayload> {
  const limit = resolveLimit(options.limit);
  const dateBeginGte = resolveDateBeginGte(options.dateBeginGte);
  const language = resolveLanguage(options.language);
  const token = resolveToken();
  const userId = resolveUserId(options.userId);
  const skip = resolveSkip(options.skip);

  let booked: BookedEventsResult | null = null;
  if (token && userId) {
    booked = await fetchBookedEvents(token, language, dateBeginGte, userId);
  }

  let eventsDateBeginGte = dateBeginGte;
  if (booked?.latestBookedStartsAt !== null) {
    const candidateStartsAtMs = booked.latestBookedStartsAt + TWO_DAYS_MS;
    const requestedStartsAtMs = toEpoch(dateBeginGte);
    const effectiveStartsAtMs =
      requestedStartsAtMs !== null
        ? Math.max(requestedStartsAtMs, candidateStartsAtMs)
        : candidateStartsAtMs;
    eventsDateBeginGte = new Date(effectiveStartsAtMs).toISOString();
  }

  const url = new URL('/api/events', resolveApiBaseUrl());
  url.searchParams.set('date_begin_gte', eventsDateBeginGte);
  url.searchParams.set('$sort[date_begin]', '1');
  url.searchParams.set('$sort[coach_id]', '1');
  url.searchParams.set('is_published', 'true');
  url.searchParams.set('status_ne', 'cancelled');
  url.searchParams.set('$limit', String(limit));
  url.searchParams.set('$skip', String(skip));

  const locationId = resolveLocationId(options.locationId);
  if (locationId) {
    url.searchParams.set('location_id', locationId);
  }

  const headers: Record<string, string> = {
    accept: 'application/json, text/plain, */*',
    'accept-language': language
  };
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Beat81 events request failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const normalized = normalizeEvents((await response.json()) as unknown);

  let items = normalized.items;
  if (booked) {
    items = mergeEvents(items, booked.bookedItems, booked.latestBookedStartsAt, limit);
  }

  return {
    items,
    count: items.length,
    sourceTotal: normalized.sourceTotal,
    fetchedAt: new Date().toISOString()
  };
}
