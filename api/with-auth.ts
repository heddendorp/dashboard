import { isAuthorizedRequest, respondUnauthorized } from './auth';
import { loadLocalApiEnv } from './env';
import type { ApiRequest, ApiResponse } from './types';

type ApiHandler = (req: ApiRequest, res: ApiResponse) => void | Promise<void>;

export function withApiAuth(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    loadLocalApiEnv();

    if (!isAuthorizedRequest(req)) {
      respondUnauthorized(res);
      return;
    }

    await handler(req, res);
  };
}
