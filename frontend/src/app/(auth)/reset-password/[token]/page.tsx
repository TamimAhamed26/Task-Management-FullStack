'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type TokenValidationState = 'validating' | 'valid' | 'invalid';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tokenState, setTokenState] = useState<TokenValidationState>('validating');

  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenState('invalid');
        setError('No reset token provided.');
        return;
      }
      try {
        // CHANGED: Direct call to the NestJS backend to validate the token
        const response = await fetch(`http://localhost:3001/auth/reset-password/${token}`);
        const data = await response.json();
        if (!response.ok || !data.message.startsWith('You can now')) {
            throw new Error(data.message || 'Invalid or expired token.');
        }
        setTokenState('valid');
      } catch (err: any) {
        setTokenState('invalid');
        setError(err.message);
      }
    };
    validateToken();
  }, [token]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
        // CHANGED: Direct call to the NestJS backend to post the new password
        const response = await fetch('http://localhost:3001/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword: password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to reset password.');
        }
        setSuccessMessage('Your password has been reset successfully! Redirecting to login...');
        setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSubmitting(false);
    }
  }

  const renderContent = () => {
    if (tokenState === 'validating') {
      return <div className="text-center"><span className="loading loading-lg loading-spinner"></span><p>Validating token...</p></div>;
    }
    if (tokenState === 'invalid') {
        return <div role="alert" className="alert alert-error"><svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>Error! {error}</span></div>
    }
    if (successMessage) {
        return <div role="alert" className="alert alert-success"><svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>{successMessage}</span></div>
    }
    return (
        <form onSubmit={handleSubmit}>
            <div className="form-control">
                <label className="label"><span className="label-text">New Password</span></label>
                <input type="password" placeholder="••••••••" className="w-full input input-bordered" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="form-control">
                <label className="label"><span className="label-text">Confirm New Password</span></label>
                <input type="password" placeholder="••••••••" className="w-full input input-bordered" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            {error && <p className="mt-2 text-sm text-error">{error}</p>}
            <div className="mt-6 form-control">
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting && <span className="loading loading-spinner"></span>}
                    Reset Password
                </button>
            </div>
        </form>
    );
  }

  return (
    <div className="min-h-screen hero bg-base-200">
      <div className="w-full max-w-md hero-content">
        <div className="w-full shadow-2xl card bg-base-100">
          <div className="card-body">
            <h1 className="text-2xl font-bold">Set a New Password</h1>
            <div className="py-2">{renderContent()}</div>
            <div className="mt-4 text-sm text-center">
              <Link href="/login" className="link link-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}