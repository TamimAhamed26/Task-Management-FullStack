'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const checkStatusAndConnect = async () => {
      try {
        const statusRes = await fetch('http://localhost:3001/auth/status', {
          credentials: 'include',
        });
        const statusData = await statusRes.json();
        console.log('📡 Auth status response:', statusData);
        setTokenStatus(statusData.tokenStatus);

        if (statusData.tokenStatus === 'expired') {
          setFeedback('You were logged out due to inactivity.');
          router.replace('/login');
          return;
        }

        const userRes = await fetch('http://localhost:3001/users/me', {
          credentials: 'include',
        });
        if (!userRes.ok) throw new Error('Not authenticated');
        const userData = await userRes.json();
        console.log('👤 User data:', userData);
        setUser(userData);

        // Get token from cookie or status response
        const cookieToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('accessToken='))
          ?.split('=')[1];
        const token = statusData.accessToken || statusData.newAccessToken || cookieToken;
        if (!token) {
          throw new Error('Access token not available');
        }
        console.log('📤 Socket connection token:', token);

        const socket = io('http://localhost:3001/chat', {
          transports: ['websocket'],
          withCredentials: true,
          autoConnect: false,
          auth: {
            token, 
          },
          extraHeaders: {
            Authorization: `Bearer ${token}`,
            Cookie: document.cookie, 
          },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ Socket connected successfully!');
          setSocketStatus('connected');
        });

        socket.on('disconnect', (reason) => {
          console.log(`🔌 Socket disconnected. Reason: ${reason}`);
          setSocketStatus('disconnected');
        });

        socket.on('connect_error', (err) => {
          console.error('❌ Socket connection error:', err.message);
          setSocketStatus('disconnected');
          setFeedback(`Socket connection error: ${err.message}`);
        });

        if (statusData.tokenStatus === 'refreshed') {
          setFeedback('Your session was refreshed. Reconnecting chat...');
        }

        console.log('Attempting to connect socket...');
        setSocketStatus('connecting');
        socket.connect();

      } catch (err) {
        console.error('AuthGuard error:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkStatusAndConnect();

    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection.');
        socketRef.current.disconnect();
      }
    };
  }, [router]);

  return {
    user,
    loading,
    tokenStatus,
    feedback,
    chatSocket: socketRef.current,
    socketStatus,
  };
}