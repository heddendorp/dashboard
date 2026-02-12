import type { Beat81EventType, Beat81EventTypesPayload } from '../../types';

const DEFAULT_BEAT81_API_BASE_URL = 'https://api.production.b81.io';
const DEFAULT_LANGUAGE = 'de';
const DEFAULT_LIMIT = 50;

interface Beat81ApiEventType {
  _id?: string | number;
  id?: string | number;
  name?: string;
}

interface Beat81ApiResponse {
  data?: Beat81ApiEventType[];
  total?: number;
}

interface Beat81EventTypesOptions {
  isPublished?: boolean;
  language?: string;
  limit?: number;
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

  const envLimit = Number.parseInt(process.env['BEAT81_EVENT_TYPES_LIMIT'] ?? '', 10);
  return Number.isInteger(envLimit) && envLimit > 0 ? envLimit : DEFAULT_LIMIT;
}

function normalizeEventTypes(payload: unknown): { items: Beat81EventType[]; sourceTotal: number | null } {
  const response = payload as Beat81ApiResponse;
  const rawItems = Array.isArray(response.data)
    ? response.data
    : Array.isArray(payload)
      ? (payload as Beat81ApiEventType[])
      : [];

  const items: Beat81EventType[] = rawItems
    .filter((item) => typeof item?.name === 'string')
    .map((item, index) => {
      const rawId = item._id ?? item.id ?? `idx-${index}`;
      return {
        id: String(rawId),
        name: item.name as string
      };
    });

  return {
    items,
    sourceTotal: typeof response.total === 'number' ? response.total : null
  };
}

export async function fetchBeat81EventTypes(
  options: Beat81EventTypesOptions = {}
): Promise<Beat81EventTypesPayload> {
  const url = new URL('/api/event-types', resolveApiBaseUrl());
  url.searchParams.set('$sort[name]', '1');
  url.searchParams.set('is_published', String(options.isPublished ?? true));
  url.searchParams.set('$limit', String(resolveLimit(options.limit)));

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': resolveLanguage(options.language)
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Beat81 request failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const normalized = normalizeEventTypes((await response.json()) as unknown);

  return {
    items: normalized.items,
    count: normalized.items.length,
    sourceTotal: normalized.sourceTotal,
    fetchedAt: new Date().toISOString()
  };
}
