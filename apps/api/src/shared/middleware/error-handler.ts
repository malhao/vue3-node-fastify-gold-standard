import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AppError, type ErrorCode, type ErrorDetail } from '../errors/app-error.js';

// Framework errors that already carry a client-facing 4xx status map to the canonical
// code for that status; anything else (400 malformed JSON, 413 too large, …) is treated
// as a validation failure.
const STATUS_TO_CODE: Record<number, ErrorCode> = {
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'RESOURCE_NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};

/** Fastify sets `code: 'FST_ERR_VALIDATION'` and populates `validation` for schema failures,
 * regardless of validator provider — see fastify-zod-openapi's `RequestValidationError` shape. */
function isFastifyValidationError(
  error: FastifyError | Error,
): error is FastifyError & { validation: Array<{ instancePath: string; message?: string }> } {
  return (
    'code' in error &&
    error.code === 'FST_ERR_VALIDATION' &&
    'validation' in error &&
    Array.isArray((error as FastifyError).validation)
  );
}

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: ErrorDetail[];
    requestId: string;
  };
}

function send(reply: FastifyReply, statusCode: number, body: ErrorEnvelope): void {
  reply.status(statusCode).send(body);
}

/** Centralized error handler — the only place that maps errors onto the API's response envelope. */
export function registerErrorHandler(app: FastifyInstance): void {
  // Unknown routes: emit the same envelope rather than Fastify's default
  // `{ message, error, statusCode }`, so 404s conform to the API contract too.
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    send(reply, 404, {
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'The requested resource was not found.',
        details: [],
        requestId: request.id,
      },
    });
  });

  app.setErrorHandler(
    (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
      const requestId = request.id;

      if (isFastifyValidationError(error)) {
        const details: ErrorDetail[] = error.validation.map((issue) => ({
          path: issue.instancePath.replace(/^\//, '').replace(/\//g, '.'),
          message: issue.message ?? 'Invalid value.',
        }));

        send(reply, 422, {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'The submitted data is invalid.',
            details,
            requestId,
          },
        });
        return;
      }

      if (error instanceof AppError) {
        send(reply, error.statusCode, {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            requestId,
          },
        });
        return;
      }

      // Fastify's own framework errors (malformed JSON, payload too large, and
      // plugin-thrown errors like @fastify/rate-limit's 429) already carry a
      // client-facing 4xx statusCode — pass it through with the canonical code for
      // that status rather than collapsing every non-AppError into a 500.
      if (
        'statusCode' in error &&
        typeof error.statusCode === 'number' &&
        error.statusCode >= 400 &&
        error.statusCode < 500
      ) {
        send(reply, error.statusCode, {
          error: {
            code: STATUS_TO_CODE[error.statusCode] ?? 'VALIDATION_FAILED',
            message: error.message,
            details: [],
            requestId,
          },
        });
        return;
      }

      // Unexpected programmer/system error: log with full context, never leak internals to the client.
      request.log.error({ err: error }, 'Unhandled error');
      send(reply, 500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
          details: [],
          requestId,
        },
      });
    },
  );
}
