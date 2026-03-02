import { io } from "socket.io-client";

// Remove /api from socket URL since Socket.io doesn't use it
const socketURL = import.meta.env.VITE_API_URL?.replace('/api', '') || import.meta.env.VITE_API_URL;

const socket = io(socketURL, {
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports: ["polling", "websocket"]
});

socket.on('connect', () => {
  console.log('✅ Connected to server with ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server:', reason);
});

export default socket;