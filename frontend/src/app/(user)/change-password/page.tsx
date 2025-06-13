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
    confirmPassword: '',
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Password strength validation
  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/\d/.test(password)) errors.push('One number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character');
    return errors;
  };

  const getPasswordStrength = (password: string) => {
    const errors = validatePassword(password);
    if (password.length === 0) return { strength: 'none', color: '' };
    if (errors.length >= 4) return { strength: 'Very Weak', color: 'text-error' };
    if (errors.length >= 3) return { strength: 'Weak', color: 'text-warning' };
    if (errors.length >= 2) return { strength: 'Fair', color: 'text-info' };
    if (errors.length >= 1) return { strength: 'Good', color: 'text-success' };
    return { strength: 'Strong', color: 'text-success font-semibold' };
  };

  const handleInputChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    
    // Clear validation errors when user starts typing
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: '' });
    }
    
    // Clear general error
    if (error) setError(null);
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!form.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!form.newPassword) {
      errors.newPassword = 'New password is required';
    } else {
      const passwordErrors = validatePassword(form.newPassword);
      if (passwordErrors.length > 0) {
        errors.newPassword = 'Password must meet all requirements';
      }
    }
    
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (form.newPassword !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('http://localhost:3001/users/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Password changed successfully! You will be logged out for security.');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        
        setTimeout(async () => {
          await fetch('http://localhost:3001/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
          router.push('/login?message=password-changed');
        }, 3000);
      } else {
        setError(data.message || 'Failed to change password. Please try again.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
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

  const passwordStrength = getPasswordStrength(form.newPassword);
  const passwordErrors = validatePassword(form.newPassword);

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-base-content">Change Password</h1>
          <p className="text-base-content/70 mt-2">Update your password to keep your account secure</p>
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
              {/* Current Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Current Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    className={`input input-bordered w-full pr-12 ${
                      validationErrors.currentPassword ? 'input-error' : ''
                    }`}
                    placeholder="Enter your current password"
                    value={form.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPasswords.current ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {validationErrors.currentPassword && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.currentPassword}</span>
                  </label>
                )}
              </div>

              {/* New Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">New Password</span>
                  {form.newPassword && (
                    <span className={`label-text-alt ${passwordStrength.color}`}>
                      {passwordStrength.strength}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    className={`input input-bordered w-full pr-12 ${
                      validationErrors.newPassword ? 'input-error' : ''
                    }`}
                    placeholder="Enter your new password"
                    value={form.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPasswords.new ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Password Requirements */}
                {form.newPassword && (
                  <div className="mt-2 p-3 bg-base-200 rounded-lg">
                    <p className="text-sm font-medium text-base-content/70 mb-2">Password Requirements:</p>
                    <div className="space-y-1">
                      {[
                        { text: 'At least 8 characters', valid: form.newPassword.length >= 8 },
                        { text: 'One uppercase letter', valid: /[A-Z]/.test(form.newPassword) },
                        { text: 'One lowercase letter', valid: /[a-z]/.test(form.newPassword) },
                        { text: 'One number', valid: /\d/.test(form.newPassword) },
                        { text: 'One special character', valid: /[!@#$%^&*(),.?":{}|<>]/.test(form.newPassword) },
                      ].map((req, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          {req.valid ? (
                            <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          <span className={req.valid ? 'text-success' : 'text-base-content/50'}>{req.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {validationErrors.newPassword && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.newPassword}</span>
                  </label>
                )}
              </div>

              {/* Confirm Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Confirm New Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    className={`input input-bordered w-full pr-12 ${
                      validationErrors.confirmPassword ? 'input-error' : ''
                    } ${
                      form.confirmPassword && form.newPassword === form.confirmPassword ? 'input-success' : ''
                    }`}
                    placeholder="Confirm your new password"
                    value={form.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.confirmPassword}</span>
                  </label>
                )}
                {form.confirmPassword && form.newPassword === form.confirmPassword && !validationErrors.confirmPassword && (
                  <label className="label">
                    <span className="label-text-alt text-success">Passwords match!</span>
                  </label>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`btn btn-primary w-full ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting || success !== null}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Updating Password...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Update Password
                  </>
                )}
              </button>
            </form>

            {/* Security Notice */}
            <div className="divider">Security Notice</div>
            <div className="text-center">
              <div className="alert alert-warning">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm">You will be automatically logged out after changing your password for security reasons.</span>
              </div>
            </div>
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
            Back to Settings
          </button>
        </div>
      </div>
    </div>
  );
}