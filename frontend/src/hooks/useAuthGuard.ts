'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const statusRes = await fetch('http://localhost:3001/auth/status', {
          credentials: 'include',
        });
        const statusData = await statusRes.json();
        setTokenStatus(statusData.tokenStatus);

        if (statusData.tokenStatus === 'expired') {
          setFeedback('You were logged out due to inactivity. Please login again.');
          router.replace('/login');
          return;
        }

        if (statusData.tokenStatus === 'refreshed') {
          setFeedback('Your session was kept alive with a refreshed token.');
        }

        const userRes = await fetch('http://localhost:3001/users/me', {
          credentials: 'include',
        });

        if (!userRes.ok) {
          router.replace('/login');
          return;
        }

        const userData = await userRes.json();
        setUser(userData);
      } catch (err) {
        console.error('AuthGuard error:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [router]);

  return { user, loading, tokenStatus, feedback }; 
}
