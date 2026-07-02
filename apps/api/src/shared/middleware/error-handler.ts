import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AppError, type ErrorDetail } from '../errors/app-error.js';

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
