export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta extends PaginationParams {
  total: number;
  totalPages: number;
}

export function buildPaginationMeta(params: PaginationParams, total: number): PaginationMeta {
  return {
    ...params,
    total,
    totalPages: Math.ceil(total / params.limit),
  };
}

/** Parses page/limit query params with sane defaults and bounds. */
export function parsePaginationQuery(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit };
}
