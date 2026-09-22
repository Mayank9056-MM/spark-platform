import { useMutation } from '@tanstack/react-query';

import { confirmPasswordReset } from '../api/confirm-password-reset';

export function useConfirmPasswordReset() {
  return useMutation({ mutationFn: confirmPasswordReset });
}
