import { type Metadata } from 'next';

import { PasswordResetRequestForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

export default function PasswordResetRequestPage() {
  return <PasswordResetRequestForm />;
}
