// utils/socket.js
import { io } from "socket.io-client";
import { getSessionToken, clearSession } from "./tokenHelper"; // Use helper instead of AuthService

// Remove /api from socket URL since Socket.io doesn't use it
const socketURL = import.meta.env.VITE_API_URL?.replace('/api', '') || import.meta.env.VITE_API_URL;

// Create socket connection with auth
const socket = io(socketURL, {
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports: ["polling", "websocket"],
  auth: {
    token: getSessionToken() // Use helper function
  }
});

// Socket event listeners
socket.on('connect', () => {
  console.log('✅ Connected to server with ID:', socket.id);
  
  const sessionToken = getSessionToken();
  if (sessionToken) {
    socket.emit('join-session-room', sessionToken);
    console.log('🔐 Joined session room with token:', sessionToken.substring(0, 10) + '...');
  }
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🔴 Socket connection error:', error.message);
});

// Listen for force logout events
socket.on('force-logout', (data) => {
  console.log('🔴 Force logout received:', data);
  
  clearSession(); // Clear session using helper
  
  // Dispatch event for React components
  const event = new CustomEvent('force-logout', { 
    detail: { message: data.message || 'You have been logged out from another device.' } 
  });
  window.dispatchEvent(event);
});

// Reconnect with updated token
export const updateSocketAuth = () => {
  const newToken = getSessionToken();
  if (newToken) {
    socket.auth = { token: newToken };
    socket.disconnect().connect();
  }
};

export default socket;