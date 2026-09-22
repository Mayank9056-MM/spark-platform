import { useContext } from 'react';

import { AuthContext } from '../components/auth-provider';

/** Must be called within <AuthProvider> (mounted by the protected app layout). */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
