import { trace } from '@opentelemetry/api';
import type { FastifyBaseLogger } from 'fastify';
import type { PinoLoggerOptions } from 'fastify/types/logger.js';

import { config } from '../config/env.js';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
];

/** Correlates every log line with the active trace/span, per observability.md §3/§6. */
function mixin(): Record<string, string> {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (!spanContext) return {};
  return { trace_id: spanContext.traceId, span_id: spanContext.spanId };
}

export const loggerOptions: PinoLoggerOptions = {
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: { paths: redactPaths, censor: '[REDACTED]' },
  mixin,
  ...(config.NODE_ENV === 'production' ? {} : { transport: { target: 'pino-pretty' } }),
};

export type Logger = FastifyBaseLogger;
