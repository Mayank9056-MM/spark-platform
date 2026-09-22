import { type Metadata } from 'next';

import { ACTIVATION_TOKEN_PARAM, ActivateForm, resolveActivationToken } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Activate account',
  robots: { index: false, follow: false },
  // The URL carries a single-use secret; never leak it through Referer.
  referrer: 'no-referrer',
};

interface ActivatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const params = await searchParams;

  // The token stays local to this page and form: no context, store or storage.
  return <ActivateForm token={resolveActivationToken(params[ACTIVATION_TOKEN_PARAM])} />;
}
