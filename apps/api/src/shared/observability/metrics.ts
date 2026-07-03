import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('api');

/** RED metrics — Rate, Errors, Duration — per observability.md §3/§7. */
export const httpRequestCounter = meter.createCounter('http.server.request.count', {
  description: 'Count of HTTP requests handled, by route/method/status',
});

export const httpRequestDuration = meter.createHistogram('http.server.request.duration', {
  description: 'HTTP request duration',
  unit: 'ms',
});
