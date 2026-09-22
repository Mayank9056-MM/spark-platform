import { type Metadata } from 'next';

import {
  ACTIVATED_QUERY_PARAM,
  LoginForm,
  REDIRECT_PARAM,
  RESET_QUERY_PARAM,
  resolveSafeRedirect,
} from '@/features/auth';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <LoginForm
      redirectTo={resolveSafeRedirect(params[REDIRECT_PARAM])}
      initialActivated={params[ACTIVATED_QUERY_PARAM] === '1'}
      initialReset={params[RESET_QUERY_PARAM] === '1'}
    />
  );
}
