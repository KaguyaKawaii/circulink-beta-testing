
import { io } from "socket.io-client";

// ✅ FIXED: Allow both transports to match server
const socket = io("http://localhost:5000", {
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  // ✅ FIX: Match server transports
  transports: ["polling", "websocket"]
});

socket.on('connect', () => {
  console.log('✅ Connected to server with ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server:', reason);
});

export default socket;
