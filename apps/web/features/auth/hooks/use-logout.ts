import { useMutation } from '@tanstack/react-query';

import { logout } from '../api/logout';

/**
 * The raw mutation only — navigation and cache/session cleanup are
 * owned by AuthProvider's logout(), which is what components should
 * actually call (via useAuth()). Kept as its own hook so the mutation
 * definition stays independent of the context.
 */
export function useLogout() {
  return useMutation({ mutationFn: logout });
}
