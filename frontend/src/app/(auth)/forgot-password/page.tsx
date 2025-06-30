'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      if (!email) {
        throw new Error('Email is required.');
      }
      const response = await fetch('http://localhost:3001/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An unknown error occurred.');
      }
      
      setSuccessMessage('If an account with that email exists, a password reset link has been sent to your inbox.');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen hero bg-base-200">
      <div className="w-full max-w-md hero-content">
        <div className="w-full shadow-2xl card bg-base-100">
          <form className="card-body" onSubmit={handleSubmit}>
            <h1 className="text-2xl font-bold">Forgot Your Password?</h1>
            <p className="py-2 text-base-content/70">
              No problem. Enter your email address below, and we'll send you a link to reset it.
            </p>
            
            {!successMessage ? (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    className="w-full input input-bordered"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                {error && <p className="mt-2 text-sm text-error">{error}</p>}
                
                <div className="mt-6 form-control">
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting && <span className="loading loading-spinner"></span>}
                    Send Reset Link
                  </button>
                </div>
              </>
            ) : (
              <div role="alert" className="p-4 border rounded-md alert-success text-success-content">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{successMessage}</span>
              </div>
            )}
            
            <div className="mt-4 text-sm text-center">
              <Link href="/login" className="link link-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}