import { type Metadata } from 'next';

import { LoginForm, REDIRECT_PARAM, resolveSafeRedirect } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  // Sanitised on the server so the client component only ever receives a
  // destination that is safe to navigate to. Reading searchParams here also
  // avoids the Suspense boundary that useSearchParams() would require.
  return <LoginForm redirectTo={resolveSafeRedirect(params[REDIRECT_PARAM])} />;
}
