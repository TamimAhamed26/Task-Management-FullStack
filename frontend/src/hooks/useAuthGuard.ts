'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Define a module-scoped variable for the chat socket.
// This ensures it's a singleton across the app, but managed by this hook.
let chatSocket: Socket | null = null;

// This helper function handles the creation and event listeners for the socket.
// It ensures listeners are only attached once if the socket is reused.
const initializeChatSocket = (router: any) => {
  if (chatSocket) {
    // If socket already exists, ensure its current state is for the new auth.
    // For cookie-based auth, a disconnect/reconnect will pick up new cookies.
    chatSocket.disconnect(); // Force disconnect to pick up new cookies
    chatSocket.connect();    // Reconnect
    return chatSocket;
  }

  // Create new socket instance
  chatSocket = io('http://localhost:3001/chat', { // Your backend Socket.IO URL and namespace
    withCredentials: true, // IMPORTANT: Allows the browser to send HTTP-only cookies
    transports: ['websocket'], // Prefer WebSocket
  });

  // Attach core event listeners for connection management and auth errors
  chatSocket.on('connect', () => {
    console.log('Chat Socket Connected:', chatSocket?.id);
  });

  chatSocket.on('disconnect', (reason) => {
    console.log('Chat Socket Disconnected:', reason);
    if (reason === 'io server disconnect' || reason === 'io client disconnect') {
      // Intentional disconnect, no special action needed
    } else {
      console.warn('Unexpected Socket.IO disconnect, attempting reconnect...');
      // Socket.IO client typically handles auto-reconnects by default.
    }
  });

  chatSocket.on('connect_error', (err) => {
    console.error('Chat Socket Connection Error:', err.message);
    // If the error message suggests an authentication failure from WsJwtGuard
    if (
      err.message.includes('Unauthorized') ||
      err.message.includes('token') ||
      err.message.includes('No token provided') ||
      err.message.includes('Invalid or expired token') ||
      err.message.includes('Token blacklisted')
    ) {
      console.log('Auth error on WebSocket, redirecting to login...');
      // Use router.push/replace here to ensure navigation
      router.replace('/login');
      // Clean up the socket as it's likely permanently invalid
      if (chatSocket) {
        chatSocket.disconnect();
        chatSocket = null;
      }
    } else {
      // Other connection errors (e.g., network issues)
      console.error('Non-auth WebSocket error:', err.message);
    }
  });

  // Return the newly created socket instance
  return chatSocket;
};

// This function clears the module-scoped socket instance
const clearChatSocket = () => {
  if (chatSocket) {
    chatSocket.disconnect();
    chatSocket = null;
  }
};


export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Use a ref to hold the current socket instance that this hook manages,
  // making it available to the return value without re-initializing.
  const socketRef = useRef<Socket | null>(null);


  // Effect to initialize/manage the socket lifecycle
  useEffect(() => {
    // Initialize or re-initialize the socket.
    // This runs on mount and potentially when a token refresh forces a re-auth.
    socketRef.current = initializeChatSocket(router);

    // Cleanup function for when the component using this hook unmounts
    return () => {
      clearChatSocket(); // Disconnect and clear the global socket instance
    };
  }, [router]); // Depend on router, as it's used in initializeChatSocket


  // Effect to check authentication status regularly
  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true); // Indicate loading while checking status
      try {
        const statusRes = await fetch('http://localhost:3001/auth/status', {
          credentials: 'include',
        });
        const statusData = await statusRes.json();
        setTokenStatus(statusData.tokenStatus);
        // Note: statusData.newAccessToken is not directly used to init socket,
        // as we rely on the browser's cookie jar and withCredentials:true.

        if (statusData.tokenStatus === 'expired') {
          setFeedback('You were logged out due to inactivity. Please login again.');
          clearChatSocket(); // Clear socket on explicit logout
          router.replace('/login');
          return;
        }

        if (statusData.tokenStatus === 'refreshed') {
          setFeedback('Your session was kept alive with a refreshed token.');
          // When token is refreshed, force the socket to re-authenticate
          // by disconnecting and reconnecting. This picks up the new cookie.
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current.connect();
          }
        }

        const userRes = await fetch('http://localhost:3001/users/me', {
          credentials: 'include',
        });

        if (!userRes.ok) {
          clearChatSocket(); // Clear socket on failed user fetch
          router.replace('/login');
          return;
        }

        const userData = await userRes.json();
        setUser(userData);

      } catch (err) {
        console.error('AuthGuard error:', err);
        clearChatSocket(); // Clear socket on any AuthGuard error
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    // Initial status check and subsequent checks based on your app's logic (e.g., setInterval)
    checkStatus();
  }, [router]); // Depend on router for consistent behavior

  // Return the current user, loading state, token status, feedback, and the chat socket instance
  return {
    user,
    loading,
    tokenStatus,
    feedback,
    chatSocket: socketRef.current // Expose the managed socket instance
  };
}