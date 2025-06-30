'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // This will catch backend errors like "User not found" or "Email is already verified"
        throw new Error(data.message || 'An unknown error occurred.');
      }
      
      setSuccessMessage(data.message);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero bg-base-200">
      <div className="w-full max-w-md hero-content">
        <div className="w-full shadow-2xl card bg-base-100">
          <form className="card-body" onSubmit={handleSubmit}>
            <h1 className="text-2xl font-bold">Resend Verification Email</h1>
            <p className="py-2 text-base-content/70">
              Enter your email address below, and if an unverified account exists, we'll send a new verification link.
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
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading && <span className="loading loading-spinner"></span>}
                    Resend Link
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