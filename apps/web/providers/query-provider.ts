import { QueryClient } from '@tanstack/react-query';

import { ApiClientError, isUnauthenticatedError } from '@/lib/api/api-error';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (isUnauthenticatedError(error)) {
            return false;
          }
          if (error instanceof ApiClientError) {
            // Never retry deterministic client errors (400, 401, 403, 404, 409, 422)
            if (error.status >= 400 && error.status < 500) {
              return false;
            }
          }
          const candidate = error as { status?: unknown; response?: { status?: unknown } };
          const status = candidate?.status ?? candidate?.response?.status;
          if (typeof status === 'number' && status >= 400 && status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
