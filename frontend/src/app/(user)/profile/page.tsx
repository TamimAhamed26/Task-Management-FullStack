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
      <div className="min-h-screen bg-base-200 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary dark:text-indigo-400"></span>
          <p className="mt-4 text-base-content/70 dark:text-gray-100">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 dark:bg-gray-900 font-sans">
      {/* Topbar - Fixed to top */}
      <nav className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white dark:text-gray-100 shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l7 7m-7-7v10a1 1 0 01-1 1h-3"></path>
                </svg>
                <span className="text-xl font-extrabold tracking-wide">Manager Dashboard</span>
              </Link>
            </div>
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200">
                {isAvatarLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border-2 border-white">
                    <span className="text-gray-600 dark:text-gray-100 font-bold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-lg">{user.username || 'User'}</span>
                <svg
                  className="w-5 h-5 ml-1"
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
                className="dropdown-content menu p-2 shadow-lg bg-base-100 dark:bg-gray-800 rounded-box w-52 mt-3 text-gray-800 dark:text-gray-100 transform origin-top-right scale-95 opacity-0 transition-all duration-200 ease-out [--tab-focus:0] data-[dropdown-open]:scale-100 data-[dropdown-open]:opacity-100"
              >
                <li>
                  <Link href="/change-password" className="flex items-center px-4 py-2 hover:bg-base-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-200">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Change Password
                  </Link>
                </li>
                <li>
                  <Link href="/avatar" className="flex items-center px-4 py-2 hover:bg-base-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-200">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Upload Avatar
                  </Link>
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
                    className="flex items-center w-full text-left px-4 py-2 hover:bg-base-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content with top padding to account for fixed navbar */}
      <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8"> {/* Increased padding for better spacing */}
        <div className="max-w-md mx-auto">
          {/* Header with icon */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-primary/10 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-10 h-10 text-primary dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-base-content dark:text-gray-100 mb-2">Edit Profile</h1>
            <p className="text-base-content/70 dark:text-gray-300 text-lg">Manage your personal information and preferences</p>
          </div>

          {/* Main Card */}
          <div className="card bg-base-100 dark:bg-gray-800 shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="card-body p-8"> {/* Increased padding inside card body */}
              {/* Alerts */}
              {tokenStatus === 'refreshed' && (
                <div role="alert" className="alert alert-info mb-4 rounded-lg flex items-center p-3 text-sm animate-fade-in-down">
                  <svg className="w-5 h-5 text-info dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-100">Session refreshed for security</span>
                </div>
              )}
              {success && (
                <div role="alert" className="alert alert-success mb-4 rounded-lg flex items-center p-3 text-sm animate-fade-in-down">
                  <svg className="w-5 h-5 text-success dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-100">{success}</span>
                </div>
              )}
              {error && (
                <div role="alert" className="alert alert-error mb-4 rounded-lg flex items-center p-3 text-sm animate-fade-in-down">
                  <svg className="w-5 h-5 text-error dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-800 dark:text-gray-100">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Username
                    </span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    className={`input input-bordered input-primary w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${
                      validationErrors.username ? 'input-error' : form.username ? 'input-success' : ''
                    }`}
                    placeholder="Enter your username"
                    value={form.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    disabled={isSubmitting}
                  />
                  {validationErrors.username && (
                    <label className="label">
                      <span className="label-text-alt text-error dark:text-red-400 text-sm mt-1">{validationErrors.username}</span>
                    </label>
                  )}
                </div>

                {/* Email */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className={`input input-bordered input-primary w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${
                      validationErrors.email ? 'input-error' : form.email ? 'input-success' : ''
                    }`}
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isSubmitting}
                  />
                  {validationErrors.email && (
                    <label className="label">
                      <span className="label-text-alt text-error dark:text-red-400 text-sm mt-1">{validationErrors.email}</span>
                    </label>
                  )}
                </div>

                {/* Phone */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Phone
                    </span>
                  </label>
                  <input
                    type="text"
                    name="phone"
                    className={`input input-bordered input-primary w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${
                      validationErrors.phone ? 'input-error' : form.phone ? 'input-success' : ''
                    }`}
                    placeholder="Enter your phone number (optional)"
                    value={form.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={isSubmitting}
                  />
                  {validationErrors.phone && (
                    <label className="label">
                      <span className="label-text-alt text-error dark:text-red-400 text-sm mt-1">{validationErrors.phone}</span>
                    </label>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className={`btn btn-primary w-full text-lg py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ${isSubmitting ? 'btn-disabled' : ''}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2"></span>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="text-center mt-8">
            <button
              className="btn btn-ghost btn-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 group"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}