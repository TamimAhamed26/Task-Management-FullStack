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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      const fetchAvatar = async () => {
        setIsAvatarLoading(true);
        try {
          const res = await fetch('http://localhost:3001/users/me', {
            credentials: 'include',
          });
          const data = await res.json();
          if (res.ok && data.avatarUrl) {
            setAvatarUrl(data.avatarUrl);
            localStorage.setItem('avatarUrl', data.avatarUrl);
          } else {
            const storedAvatar = localStorage.getItem('avatarUrl');
            if (storedAvatar) setAvatarUrl(storedAvatar);
          }
        } catch (err) {
          console.error('Failed to fetch avatar:', err);
          const storedAvatar = localStorage.getItem('avatarUrl');
          if (storedAvatar) setAvatarUrl(storedAvatar);
        } finally {
          setIsAvatarLoading(false);
        }
      };
      fetchAvatar();
    }
  }, [user]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!form.username) {
      errors.username = 'Username is required';
    } else if (form.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!form.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (form.phone && !/^\+?\d{10,15}$/.test(form.phone.replace(/\D/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: '' });
    }
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('http://localhost:3001/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to update profile. Please try again.');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8">
      {/* Topbar */}
      <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/dashboard">
                <span className="text-xl font-bold">Manager Dashboard</span>
              </Link>
            </div>
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost flex items-center gap-2">
                {isAvatarLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="hidden sm:inline">{user.username || 'User'}</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 mt-2 text-gray-800"
              >
               
                <li>
                  <Link href="/change-password">Change Password</Link>
                </li>
                <li>
                  <Link href="/avatar">Upload Avatar</Link>
                </li>
                <li>
                  <button
                    onClick={async () => {
                      await fetch('http://localhost:3001/auth/logout', {
                        method: 'POST',
                        credentials: 'include',
                      });
                      router.push('/login');
                    }}
                    disabled={isSubmitting}
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-md mx-auto mt-8">
        {/* Header */}
        <div className="text-center mb-8">
     
          <h1 className="text-2xl font-bold text-base-content">Edit Profile</h1>
          <p className="text-base-content/70 mt-2">Manage your personal information</p>
        </div>

        {/* Main Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* Alerts */}
            {tokenStatus === 'refreshed' && (
              <div className="alert alert-info mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Session refreshed for security</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="alert alert-error mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Username</span>
                </label>
                <input
                  type="text"
                  name="username"
                  className={`input input-bordered w-full ${
                    validationErrors.username ? 'input-error' : form.username ? 'input-success' : ''
                  }`}
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  disabled={isSubmitting}
                />
                {validationErrors.username && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.username}</span>
                  </label>
                )}
              </div>

              {/* Email */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Email</span>
                </label>
                <input
                  type="email"
                  name="email"
                  className={`input input-bordered w-full ${
                    validationErrors.email ? 'input-error' : form.email ? 'input-success' : ''
                  }`}
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isSubmitting}
                />
                {validationErrors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.email}</span>
                  </label>
                )}
              </div>

              {/* Phone */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Phone</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  className={`input input-bordered w-full ${
                    validationErrors.phone ? 'input-error' : form.phone ? 'input-success' : ''
                  }`}
                  placeholder="Enter your phone number (optional)"
                  value={form.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={isSubmitting}
                />
                {validationErrors.phone && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.phone}</span>
                  </label>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`btn btn-primary w-full ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-6">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back 
          </button>
        </div>
      </div>
    </div>
  );
}