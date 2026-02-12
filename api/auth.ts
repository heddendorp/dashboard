import type { ApiRequest, ApiResponse } from './types';

function decodeBasicAuthorization(headerValue: string): { username: string; password: string } | null {
  if (!headerValue.startsWith('Basic ')) {
    return null;
  }

  const encoded = headerValue.slice('Basic '.length).trim();
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');

  if (separatorIndex <= 0) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1)
  };
}

function isBasicAuthDisabled(): boolean {
  const value = process.env['BASIC_AUTH_DISABLED']?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export function isAuthorizedRequest(req: ApiRequest): boolean {
  if (isBasicAuthDisabled()) {
    return true;
  }

  const expectedUsername = process.env['BASIC_AUTH_USER'];
  const expectedPassword = process.env['BASIC_AUTH_PASS'];

  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  const authorization = req.headers['authorization'];
  const headerValue = Array.isArray(authorization) ? authorization[0] : authorization;

  if (!headerValue) {
    return false;
  }

  const credentials = decodeBasicAuthorization(headerValue);
  if (!credentials) {
    return false;
  }

  return credentials.username === expectedUsername && credentials.password === expectedPassword;
}

export function respondUnauthorized(res: ApiResponse): void {
  res.setHeader('WWW-Authenticate', 'Basic realm="hallway-dashboard"');
  res.status(401).json({
    error: 'unauthorized',
    message: 'Valid credentials are required.'
  });
}
