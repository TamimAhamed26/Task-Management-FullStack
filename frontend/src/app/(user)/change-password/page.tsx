'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, loading, tokenStatus } = useAuthGuard();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:3001/users/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Password changed successfully. Logging you out...');
        setError(null);

        setTimeout(async () => {
          await fetch('http://localhost:3001/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
          router.push('/login');
        }, 1500);
      } else {
        setError(data.message || 'Failed to change password');
        setSuccess(null);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong.');
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Change Password</h2>

      {tokenStatus === 'refreshed' && (
        <p className="text-blue-600 mb-2 text-sm text-center">
          Your session was refreshed due to inactivity.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          className="input input-bordered"
          placeholder="Current Password"
          value={form.currentPassword}
          onChange={(e) =>
            setForm({ ...form, currentPassword: e.target.value })
          }
          required
        />
        <input
          type="password"
          className="input input-bordered"
          placeholder="New Password"
          value={form.newPassword}
          onChange={(e) =>
            setForm({ ...form, newPassword: e.target.value })
          }
          required
        />
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </form>

      {success && (
        <p className="mt-4 text-green-600 text-sm text-center">{success}</p>
      )}
      {error && (
        <p className="mt-4 text-red-500 text-sm text-center">{error}</p>
      )}

      <button
        className="btn btn-secondary mt-4"
        onClick={() => router.back()}
      >
        Back
      </button>
    </div>
  );
}
