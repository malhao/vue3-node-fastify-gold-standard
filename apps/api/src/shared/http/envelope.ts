export interface SuccessEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export function ok<T>(data: T, meta?: Record<string, unknown>): SuccessEnvelope<T> {
  return meta ? { data, meta } : { data };
}

export function paginated<T>(
  data: T[],
  pagination: PaginationMeta['pagination'],
): SuccessEnvelope<T[]> {
  return { data, meta: { pagination } };
}
