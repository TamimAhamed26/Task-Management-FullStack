'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // This will catch errors from the backend, like "Email already exists"
        throw new Error(data.message || 'Failed to create account.');
      }
      
      // Use the success message directly from your backend
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
            <h1 className="text-2xl font-bold">Create an Account</h1>
            
            {!successMessage ? (
              <>
                <div className="form-control">
                  <label className="label"><span className="label-text">Username</span></label>
                  <input
                    type="text"
                    placeholder="yourusername"
                    className="w-full input input-bordered"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Email</span></label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    className="w-full input input-bordered"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Password</span></label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full input input-bordered"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Confirm Password</span></label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full input input-bordered"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {error && <p className="mt-2 text-sm text-error">{error}</p>}

                <div className="mt-6 form-control">
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading && <span className="loading loading-spinner"></span>}
                    Sign Up
                  </button>
                </div>
              </>
            ) : (
              <div role="alert" className="p-4 border rounded-md alert-success text-success-content">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                    <h3 className="font-bold">Account Created!</h3>
                    <div className="text-xs">{successMessage}</div>
                </div>
              </div>
            )}
            
            <div className="mt-4 text-sm text-center">
                <p className="text-base-content/70">
                    Already have an account?{' '}
                    <Link href="/login" className="link link-primary hover:underline">
                        Log in
                    </Link>
                </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}