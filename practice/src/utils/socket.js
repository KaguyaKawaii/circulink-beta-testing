import { io } from "socket.io-client";

// Remove /api from socket URL since Socket.io doesn't use it
const socketURL = import.meta.env.VITE_API_URL?.replace('/api', '') || import.meta.env.VITE_API_URL;

// Get token from localStorage
const getToken = () => {
  try {
    const admin = localStorage.getItem('admin');
    if (admin) {
      const parsed = JSON.parse(admin);
      return parsed.token || null;
    }
  } catch (e) {
    console.error('Error parsing admin token:', e);
  }
  return null;
};

const socket = io(socketURL, {
  withCredentials: true,
  autoConnect: false, // Changed to false to manually connect after login
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports: ["polling", "websocket"],
  auth: {
    token: getToken()
  }
});

socket.on('connect', () => {
  console.log('✅ Connected to server with ID:', socket.id);
  // Join admin room after connection
  socket.emit('join_admin_logs');
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server:', reason);
});

socket.on('connect_error', (error) => {
  console.log('Connection error:', error.message);
});

// Function to update token (call this after login)
socket.updateToken = () => {
  socket.auth = { token: getToken() };
  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
};

export default socket;