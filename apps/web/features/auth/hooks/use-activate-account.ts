import { useMutation } from '@tanstack/react-query';

import { activateAccount } from '../api/activate-account';

/** Deliberately does not mark the session as signed in: activation is not a login. */
export function useActivateAccount() {
  return useMutation({ mutationFn: activateAccount });
}
