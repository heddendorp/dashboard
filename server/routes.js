const { fetchBeat81Events } = require('./adapters/beat81/events');
const { fetchBeat81EventTypes } = require('./adapters/beat81/event-types');
const { fetchGoogleCalendarEvents } = require('./adapters/calendar/google-calendar');

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unexpected adapter error.';
}

function createBaseDashboardPayload() {
  const generatedAt = new Date().toISOString();

  return {
    generatedAt,
    timezone: 'Europe/Berlin',
    calendar: [],
    shopping: [],
    workouts: [],
    beat81EventTypes: [],
    beat81Events: [],
    health: [
      {
        widget: 'calendar',
        status: 'pending',
        message: 'Google Calendar adapter will be connected in Stage 3.'
      },
      {
        widget: 'shopping',
        status: 'pending',
        message: 'KV-backed shopping persistence will be connected in Stage 3.'
      },
      {
        widget: 'beat81',
        status: 'pending',
        message: 'Beat81 adapter will be connected in Stage 3.'
      },
      {
        widget: 'frog',
        status: 'ready',
        message: 'Layout zone is reserved for Stage 2 interactions.'
      }
    ]
  };
}

async function createDashboardPayload() {
  const payload = createBaseDashboardPayload();

  try {
    const calendar = await fetchGoogleCalendarEvents();
    payload.calendar = calendar.items;
    payload.health = payload.health.map((entry) =>
      entry.widget === 'calendar'
        ? {
            widget: 'calendar',
            status: 'ready',
            message: `Google Calendar synced (${calendar.count} upcoming events).`
          }
        : entry
    );
  } catch (error) {
    payload.health = payload.health.map((entry) =>
      entry.widget === 'calendar'
        ? {
            widget: 'calendar',
            status: 'degraded',
            message: `Google Calendar unavailable: ${getErrorMessage(error)}`
          }
        : entry
    );
  }

  try {
    const beat81 = await fetchBeat81Events();
    payload.beat81Events = beat81.items;
    payload.workouts = beat81.items.map((item) => ({
      id: item.id,
      title: item.title,
      startsAt: item.startsAt,
      location: item.location
    }));
    payload.health = payload.health.map((entry) =>
      entry.widget === 'beat81'
        ? {
            widget: 'beat81',
            status: 'ready',
            message: `Beat81 events synced (${beat81.count} upcoming classes).`
          }
        : entry
    );
  } catch (error) {
    payload.health = payload.health.map((entry) =>
      entry.widget === 'beat81'
        ? {
            widget: 'beat81',
            status: 'degraded',
            message: `Beat81 adapter unavailable: ${getErrorMessage(error)}`
          }
        : entry
    );
  }

  return payload;
}

function createHealthPayload() {
  return {
    status: 'ok',
    service: 'dashboard-bff',
    generatedAt: new Date().toISOString()
  };
}

function respondNotImplemented(res) {
  res.status(501).json({
    error: 'not_implemented',
    message: 'Shopping write APIs are part of Stage 3 data management.'
  });
}

function readStringQueryParam(req, key) {
  const value = req.query?.[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === 'string' ? value : undefined;
}

function readFirstQueryParam(req, keys) {
  for (const key of keys) {
    const value = readStringQueryParam(req, key);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function readLimit(req) {
  const parsed = Number.parseInt(readFirstQueryParam(req, ['limit', '$limit']) ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function readNonNegativeInt(req, key) {
  const parsed = Number.parseInt(readStringQueryParam(req, key) ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

async function respondBeat81EventTypes(req, res) {
  try {
    const payload = await fetchBeat81EventTypes({
      limit: readLimit(req),
      language: readStringQueryParam(req, 'language')
    });
    res.status(200).json(payload);
  } catch (error) {
    res.status(502).json({
      error: 'beat81_unavailable',
      message: getErrorMessage(error)
    });
  }
}

async function respondBeat81Events(req, res) {
  try {
    const payload = await fetchBeat81Events({
      dateBeginGte: readFirstQueryParam(req, ['dateBeginGte', 'date_begin_gte']),
      language: readFirstQueryParam(req, ['language']),
      limit: readLimit(req),
      skip:
        readNonNegativeInt(req, 'skip') ??
        readNonNegativeInt(req, '$skip') ??
        undefined,
      locationId: readFirstQueryParam(req, ['locationId', 'location_id'])
    });
    res.status(200).json(payload);
  } catch (error) {
    res.status(502).json({
      error: 'beat81_unavailable',
      message: getErrorMessage(error)
    });
  }
}

async function respondCalendarEvents(req, res) {
  try {
    const payload = await fetchGoogleCalendarEvents({
      maxResults: readLimit(req)
    });
    res.status(200).json(payload);
  } catch (error) {
    res.status(502).json({
      error: 'calendar_unavailable',
      message: getErrorMessage(error)
    });
  }
}

async function handleRoute(req, res, route) {
  const method = (req.method ?? 'GET').toUpperCase();
  const [resource] = route;

  if (route.length === 0 || (resource === 'health' && method === 'GET')) {
    res.status(200).json(createHealthPayload());
    return;
  }

  if (resource === 'dashboard' && method === 'GET') {
    const payload = await createDashboardPayload();
    res.status(200).json(payload);
    return;
  }

  if (resource === 'beat81' && route[1] === 'event-types' && method === 'GET') {
    await respondBeat81EventTypes(req, res);
    return;
  }

  if (resource === 'beat81' && route[1] === 'events' && method === 'GET') {
    await respondBeat81Events(req, res);
    return;
  }

  if (resource === 'calendar' && route[1] === 'events' && method === 'GET') {
    await respondCalendarEvents(req, res);
    return;
  }

  if (resource === 'shopping' && method === 'GET') {
    res.status(200).json({ items: [] });
    return;
  }

  if (resource === 'shopping' && (method === 'POST' || method === 'PATCH' || method === 'DELETE')) {
    respondNotImplemented(res);
    return;
  }

  res.status(404).json({
    error: 'not_found',
    message: `Route not found: ${method} /api/${route.join('/')}`
  });
}

module.exports = {
  handleRoute
};
