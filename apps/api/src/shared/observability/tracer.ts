import { SpanStatusCode, trace } from '@opentelemetry/api';

/** Tracer for manual, business-logic spans — auto-instrumentation only sees HTTP/DB calls. */
export const tracer = trace.getTracer('gold-standard-api');

/** Wraps `fn` in an active span, recording exceptions and marking the span as errored. */
export async function withSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn();
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      throw err;
    } finally {
      span.end();
    }
  });
}
