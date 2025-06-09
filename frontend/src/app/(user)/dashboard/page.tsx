'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthGuard } from '@/hooks/useAuthGuard'; // adjust path if needed

export default function DashboardPage() {
  const router = useRouter();
  const { user, tokenStatus, loading } = useAuthGuard();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Welcome, {user.username}!</h1>
      <p className="mt-2 text-lg">Your email is {user.email}</p>

      {tokenStatus === 'refreshed' && (
        <p className="text-green-600 mt-4">
          Your session was automatically refreshed.
        </p>
      )}

      <Link href="/profile">
        <button className="btn btn-primary mt-6 mr-4">View/Edit Profile</button>
      </Link>
      <button
        className="btn btn-error mt-6"
        onClick={async () => {
          await fetch('http://localhost:3001/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });

          router.push('/login');
        }}
      >
        Logout
      </button>
    </div>
  );
}
