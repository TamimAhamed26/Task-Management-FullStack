import { io, Socket } from 'socket.io-client';

export const chatSocket: Socket = io('http://localhost:3001/chat', {
  withCredentials: true,
  transports: ['websocket'],
});
