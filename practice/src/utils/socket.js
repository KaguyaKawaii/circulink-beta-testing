// socket.js
import { io } from "socket.io-client";

// Remove /api from socket URL since Socket.io doesn't use it
const baseURL = import.meta.env.VITE_API_URL || "";
const socketURL = baseURL.replace('/api', '');

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
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"],
  auth: (cb) => {
    cb({ token: getToken() });
  }
});

// Add connection handlers
socket.on('connect', () => {
  console.log('✅ Connected to server with ID:', socket.id);
  // Join admin logs room
  socket.emit('join_admin_logs');
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server:', reason);
});

socket.on('connect_error', (error) => {
  console.log('Connection error:', error.message);
});

// Function to connect socket (call after login)
socket.connectToServer = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

// Function to disconnect socket (call on logout)
socket.disconnectFromServer = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;