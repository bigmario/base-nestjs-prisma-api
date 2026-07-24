/** Query params that always contribute to a paginated cache key. */
export interface PaginationCacheKeyParams {
  page?: number;
  limit?: number;
}

/**
 * Build a deterministic cache-key suffix for a paginated query.
 * Always includes `page`/`limit` (defaulting to 1/10) and appends any
 * extra entries whose value is defined and non-empty.
 */
export function buildPaginationCacheKeySuffix(
  params: PaginationCacheKeyParams,
  extra?: Record<string, string | number | null | undefined>,
): string {
  const parts = [`page=${params.page ?? 1}`, `limit=${params.limit ?? 10}`];

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${key}=${value}`);
      }
    }
  }

  return parts.join('&');
}
