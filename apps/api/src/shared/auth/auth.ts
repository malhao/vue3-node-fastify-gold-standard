import type { FastifyInstance } from 'fastify';

import { config } from '../config/env.js';
import { UnauthenticatedError } from '../errors/app-error.js';

/**
 * STUB authentication. A single hardcoded principal sits behind a static bearer token so
 * the rest of the stack can enforce real, per-user authorization (every Tasks query is
 * scoped by `request.userId`). Replace `registerAuth` with real verification — resolve the
 * user from a verified JWT/session — and nothing downstream has to change: it only depends
 * on `request.userId` being set.
 */
export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';

declare module 'fastify' {
  interface FastifyRequest {
    // Set by the auth hook on authenticated routes (the Tasks module registers it).
    userId: string;
  }
}

function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/** Registers the auth hook on the given (encapsulated) instance — scope it to the routes
 * that require authentication by calling it inside their plugin, so health/docs stay open. */
export function registerAuth(app: FastifyInstance): void {
  app.addHook('onRequest', async (request) => {
    const token = bearerToken(request.headers.authorization);
    if (!token || token !== config.API_AUTH_TOKEN) {
      throw new UnauthenticatedError();
    }
    request.userId = DEV_USER_ID;
  });
}
