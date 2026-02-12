import type { ApiRequest, ApiResponse, DashboardPayload, HealthPayload } from './types';

function createPlaceholderDashboard(): DashboardPayload {
  return {
    generatedAt: new Date().toISOString(),
    timezone: 'Europe/Berlin',
    calendar: [],
    shopping: [],
    workouts: [],
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

function createHealthPayload(): HealthPayload {
  return {
    status: 'ok',
    service: 'dashboard-bff',
    generatedAt: new Date().toISOString()
  };
}

function respondNotImplemented(res: ApiResponse): void {
  res.status(501).json({
    error: 'not_implemented',
    message: 'Shopping write APIs are part of Stage 3 data management.'
  });
}

export function handleRoute(req: ApiRequest, res: ApiResponse, route: string[]): void {
  const method = (req.method ?? 'GET').toUpperCase();
  const [resource] = route;

  if (route.length === 0 || (resource === 'health' && method === 'GET')) {
    res.status(200).json(createHealthPayload());
    return;
  }

  if (resource === 'dashboard' && method === 'GET') {
    res.status(200).json(createPlaceholderDashboard());
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
