'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function ProfilePage() {
  const router = useRouter();
  const { user, tokenStatus, loading } = useAuthGuard(); 
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('http://localhost:3001/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSuccess('Profile updated successfully!');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Update error:', err);
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
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>

      {tokenStatus === 'refreshed' && (
        <p className="text-blue-600 mb-2">
          Your session was refreshed for security.
        </p>
      )}
      {success && <p className="text-green-600 mb-2">{success}</p>}
      {error && <p className="text-red-600 mb-2">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold">Username</label>
          <input
            type="text"
            name="username"
            className="input input-bordered w-full"
            value={form.username}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block font-semibold">Email</label>
          <input
            type="email"
            name="email"
            className="input input-bordered w-full"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block font-semibold">Phone</label>
          <input
            type="text"
            name="phone"
            className="input input-bordered w-full"
            value={form.phone}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="btn btn-primary mt-2">
          Save Changes
        </button>
      </form>

      <div className="mt-6">
        <Link href="/change-password">
          <button className="btn btn-warning mr-4">Change Password</button>
        </Link>
        <Link href="/dashboard">
          <button className="btn btn-secondary">Back to Dashboard</button>
        </Link>
        <Link href="/avatar">
          <button className="btn btn-secondary"> Update Avatar</button>
        </Link>
      </div>
    </div>
  );
}
