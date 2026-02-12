import type { Beat81Event, Beat81EventsPayload } from '../../types';

const DEFAULT_BEAT81_API_BASE_URL = 'https://api.production.b81.io';
const DEFAULT_LANGUAGE = 'de';
const DEFAULT_LIMIT = 10;
const DEFAULT_SKIP = 0;
const DEFAULT_LOCATION_ID = 'b5d7aae0-cec0-45bd-a79f-a312635078c1';

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

interface Beat81EventsOptions {
  dateBeginGte?: string;
  language?: string;
  limit?: number;
  skip?: number;
  locationId?: string;
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

function buildTrainerName(coach: Beat81ApiCoach | undefined): string | null {
  if (!coach) {
    return null;
  }

  const forename = coach.forename?.trim() ?? '';
  const surname = coach.surname?.trim() ?? '';
  const fullName = `${forename} ${surname}`.trim();
  return fullName || null;
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

  const items: Beat81Event[] = rawItems.map((item, index) => ({
    id: String(item.id ?? `idx-${index}`),
    title: item.type?.name?.trim() || 'Workout',
    startsAt: item.date_begin || '',
    location: item.location?.name?.trim() || 'Unknown location',
    trainerName: buildTrainerName(item.coach),
    trainerImageUrl: extractTrainerImageUrl(item.coach),
    ...extractCapacityFields(item)
  }));

  return {
    items,
    sourceTotal: typeof response.total === 'number' ? response.total : null
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

export async function fetchBeat81Events(options: Beat81EventsOptions = {}): Promise<Beat81EventsPayload> {
  const url = new URL('/api/events', resolveApiBaseUrl());
  url.searchParams.set('date_begin_gte', resolveDateBeginGte(options.dateBeginGte));
  url.searchParams.set('$sort[date_begin]', '1');
  url.searchParams.set('$sort[coach_id]', '1');
  url.searchParams.set('is_published', 'true');
  url.searchParams.set('status_ne', 'cancelled');
  url.searchParams.set('$limit', String(resolveLimit(options.limit)));
  url.searchParams.set('$skip', String(resolveSkip(options.skip)));

  const locationId = resolveLocationId(options.locationId);
  if (locationId) {
    url.searchParams.set('location_id', locationId);
  }

  const token = resolveToken();
  const headers: Record<string, string> = {
    accept: 'application/json, text/plain, */*',
    'accept-language': resolveLanguage(options.language)
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Beat81 events request failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const normalized = normalizeEvents((await response.json()) as unknown);
  return {
    items: normalized.items,
    count: normalized.items.length,
    sourceTotal: normalized.sourceTotal,
    fetchedAt: new Date().toISOString()
  };
}
