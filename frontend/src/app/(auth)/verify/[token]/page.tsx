//frontend\src\app\(auth)\verify\[token\]\page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('Verifying your email, please wait...');
  
  const params = useParams();
  const token = params.token as string;

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token found.');
        return;
      }

      try {
        const response = await fetch(`http://localhost:3001/auth/verify/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Verification failed.');
        }

        setStatus('success');
        setMessage(data.message); 
      
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message);
      }
    };

    verifyToken();
  }, [token]); 

  const renderStatus = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="mt-4">{message}</p>
          </div>
        );
      case 'success':
        return (
          <div role="alert" className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{message}</span>
          </div>
        );
      case 'error':
        return (
          <div role="alert" className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Error: {message}</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen hero bg-base-200">
      <div className="w-full max-w-md hero-content">
        <div className="w-full shadow-2xl card bg-base-100">
          <div className="card-body">
            <h1 className="mb-4 text-2xl font-bold text-center">Email Verification</h1>
            {renderStatus()}
            <div className="mt-6 text-center">
              <Link href="/login" className="btn btn-primary">
                Proceed to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}