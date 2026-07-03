/** Thin typed wrapper around fetch — centralizes base URL and error normalization.
 * Used as the Orval custom mutator (see orval.config.ts) for every generated request. */

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];
  readonly requestId: string;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: ApiErrorDetail[],
    requestId: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId: string;
  };
}

// Generated paths (e.g. `/api/v1/tasks`) already include the versioned API prefix,
// so the configured base is just the origin — not `.../api/v1`.
function resolveUrl(url: string): string {
  const baseUrl = import.meta.env['VITE_API_ORIGIN'] as string;
  return new URL(url, baseUrl).toString();
}

export async function http<T>(url: string, options: RequestInit = {}): Promise<T> {
  // Only set Content-Type when there's a body — Fastify rejects an empty body
  // declared as JSON (e.g. DELETE requests) with FST_ERR_CTP_EMPTY_JSON_BODY.
  const headers: HeadersInit = options.body
    ? { 'Content-Type': 'application/json', ...options.headers }
    : (options.headers ?? {});

  const response = await fetch(resolveUrl(url), { ...options, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = body as Partial<ErrorEnvelope> | null;
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? 'INTERNAL_ERROR',
      envelope?.error?.message ?? response.statusText,
      envelope?.error?.details ?? [],
      envelope?.error?.requestId ?? '',
    );
  }

  return body as T;
}
