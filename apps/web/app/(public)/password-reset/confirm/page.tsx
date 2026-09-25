import { type Metadata } from 'next';

import {
  PASSWORD_RESET_TOKEN_PARAM,
  PasswordResetConfirmForm,
  resolveActivationToken,
} from '@/features/auth';

export const metadata: Metadata = {
  title: 'Set New Password | S.P.A.R.K. College ERP',
  robots: { index: false, follow: false },
  // The URL carries a single-use secret; never leak it through Referer.
  referrer: 'no-referrer',
};

interface PasswordResetConfirmPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PasswordResetConfirmPage({
  searchParams,
}: PasswordResetConfirmPageProps) {
  const params = await searchParams;

  // resolveActivationToken is a generic "untrusted single token query
  // param" normalizer despite its name — reused here rather than
  // duplicated for the password-reset token.
  return (
    <PasswordResetConfirmForm token={resolveActivationToken(params[PASSWORD_RESET_TOKEN_PARAM])} />
  );
}
