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

export const loggerOptions: PinoLoggerOptions = {
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: { paths: redactPaths, censor: '[REDACTED]' },
  ...(config.NODE_ENV === 'production' ? {} : { transport: { target: 'pino-pretty' } }),
};

export type Logger = FastifyBaseLogger;
