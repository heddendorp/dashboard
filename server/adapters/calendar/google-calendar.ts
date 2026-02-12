import { google } from 'googleapis';

import type { CalendarEvent } from '../../types';

const DEFAULT_MAX_RESULTS = 8;
const DEFAULT_TIMEZONE = 'Europe/Berlin';

interface GoogleServiceAccountCredentials {
  client_email?: string;
  private_key?: string;
}

export interface GoogleCalendarEventsResult {
  items: CalendarEvent[];
  count: number;
  fetchedAt: string;
}

interface GoogleCalendarEventsOptions {
  maxResults?: number;
}

function resolveCalendarId(): string {
  const calendarId = process.env['GOOGLE_CALENDAR_ID']?.trim();
  if (!calendarId) {
    throw new Error('GOOGLE_CALENDAR_ID is not configured.');
  }

  return calendarId;
}

function resolveMaxResults(maxResults: number | undefined): number {
  if (typeof maxResults === 'number' && Number.isInteger(maxResults) && maxResults > 0) {
    return maxResults;
  }

  const parsed = Number.parseInt(process.env['GOOGLE_CALENDAR_MAX_RESULTS'] ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_RESULTS;
}

function resolveTimeZone(): string {
  return process.env['GOOGLE_CALENDAR_TIMEZONE']?.trim() || DEFAULT_TIMEZONE;
}

function parseServiceAccountCredentials(): GoogleServiceAccountCredentials {
  const raw =
    process.env['GOOGLE_SERVICE_ACCOUNT_JSON']?.trim() ??
    process.env['GOOGLE_SERVICE_ACCOUNT']?.trim();
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_SERVICE_ACCOUNT) is not configured.');
  }

  const parsed = JSON.parse(raw) as GoogleServiceAccountCredentials;
  const clientEmail = parsed.client_email?.trim();
  const privateKey = parsed.private_key?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.');
  }

  return {
    client_email: clientEmail,
    private_key: privateKey
  };
}

function toIsoDate(value: string | undefined): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function normalizeGoogleEvent(event: {
  id?: string | null;
  summary?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
}): CalendarEvent | null {
  const startDate = event.start?.date?.trim();
  const endDate = event.end?.date?.trim();
  const isAllDay = Boolean(startDate);
  const startsAt = isAllDay
    ? (startDate ?? '')
    : toIsoDate(event.start?.dateTime ?? undefined);
  const endsAt = isAllDay
    ? (endDate || startDate || '')
    : toIsoDate(event.end?.dateTime ?? undefined);

  if (!startsAt) {
    return null;
  }

  return {
    id: event.id ?? startsAt,
    title: event.summary?.trim() || 'Calendar event',
    startsAt,
    endsAt: endsAt || startsAt,
    allDay: isAllDay
  };
}

export async function fetchGoogleCalendarEvents(
  options: GoogleCalendarEventsOptions = {}
): Promise<GoogleCalendarEventsResult> {
  const credentials = parseServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly']
  });

  const calendar = google.calendar({ version: 'v3', auth });
  const response = await calendar.events.list({
    calendarId: resolveCalendarId(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: resolveMaxResults(options.maxResults),
    timeMin: new Date().toISOString(),
    timeZone: resolveTimeZone()
  });

  const rawItems = response.data.items ?? [];
  const items = rawItems
    .map((item) =>
      normalizeGoogleEvent({
        id: item.id,
        summary: item.summary,
        start: item.start,
        end: item.end
      })
    )
    .filter((item): item is CalendarEvent => item !== null);

  return {
    items,
    count: items.length,
    fetchedAt: new Date().toISOString()
  };
}
