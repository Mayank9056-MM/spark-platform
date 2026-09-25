import { QueryClient } from '@tanstack/react-query';

import { ApiClientError } from '@/lib/api/api-error';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiClientError) {
            // Never retry deterministic client errors (400, 401, 403, 404, 409, 422)
            if (error.status >= 400 && error.status < 500) {
              return false;
            }
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
