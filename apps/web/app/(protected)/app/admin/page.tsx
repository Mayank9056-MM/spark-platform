'use client';

import { useAuth } from '@/features/auth';

export default function AdminPage() {
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-lg font-semibold">S.P.A.R.K. Admin</h1>
      {currentUser !== undefined && (
        <p className="text-muted-foreground text-sm">
          Signed in as {currentUser.user.firstName} {currentUser.user.lastName} (
          {currentUser.user.email})
        </p>
      )}
    </div>
  );
}
