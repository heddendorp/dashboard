import { isAuthorizedRequest, respondUnauthorized } from './auth';
import { handleRoute } from './routes';
import type { ApiRequest, ApiResponse } from './types';

function toRouteSegments(req: ApiRequest): string[] {
  const rawRoute = req.query?.['route'];

  if (!rawRoute) {
    return [];
  }

  if (Array.isArray(rawRoute)) {
    return rawRoute.flatMap((part) => part.split('/')).filter(Boolean);
  }

  return rawRoute.split('/').filter(Boolean);
}

export default function handler(req: ApiRequest, res: ApiResponse): void {
  if (!isAuthorizedRequest(req)) {
    respondUnauthorized(res);
    return;
  }

  handleRoute(req, res, toRouteSegments(req));
}
