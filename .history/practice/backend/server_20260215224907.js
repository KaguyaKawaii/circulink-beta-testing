import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// ES module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// =========================
// ✅ SIMPLE BUT EFFECTIVE CORS
// =========================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://usa-circulink.vercel.app",
  "https://circulink-admin.vercel.app",
  "https://circulink-beta-testing.onrender.com"
];

// CORS middleware for Express - MUST be first
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log all incoming requests for debugging
  console.log(`${req.method} ${req.url} - Origin: ${origin || 'no origin'}`);
  
  // Set CORS headers for all responses
  if (origin) {
    if (allowedOrigins.includes(origin) || origin.includes("localhost") || origin.includes("vercel.app")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
      res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
    }
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return res.sendStatus(204);
  }
  
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =========================
// ✅ SOCKET.IO CONFIG WITH EXPLICIT CORS
// =========================
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) {
        console.log("Socket.IO: Allowing request with no origin");
        return callback(null, true);
      }

      // Allow all localhost origins
      if (origin.includes("localhost")) {
        console.log(`Socket.IO: Allowing localhost origin: ${origin}`);
        return callback(null, true);
      }

      // Allow all Vercel preview deployments
      if (origin.includes("vercel.app")) {
        console.log(`Socket.IO: Allowing Vercel origin: ${origin}`);
        return callback(null, true);
      }

      // Check against allowed origins
      if (allowedOrigins.includes(origin)) {
        console.log(`Socket.IO: Allowing allowed origin: ${origin}`);
        return callback(null, true);
      }

      console.log(`Socket.IO: Blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
  },
  transports: ["polling", "websocket"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e8, // 100 MB
  path: "/socket.io/"
});

// Make io available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// =========================
// ✅ STATIC FILES
// =========================
app.use(
  "/uploads/profile-pictures",
  express.static(path.join(__dirname, "uploads/profile-pictures"), {
    setHeaders: (res, path) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  })
);

app.use(
  "/uploads/news",
  express.static(path.join(__dirname, "uploads/news"), {
    setHeaders: (res, path) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  })
);

app.use(
  "/backups",
  express.static(path.join(__dirname, "backups"), {
    setHeaders: (res, path) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  })
);

// =========================
// ✅ SOCKET EVENTS WITH DEBUGGING
// =========================
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);
  console.log("Socket handshake:", socket.handshake.query);
  console.log("Socket origin:", socket.handshake.headers.origin);

  // Send a test message to confirm connection
  socket.emit("connected", { message: "Successfully connected to server" });

  socket.on("join", (data) => {
    console.log(`Socket ${socket.id} joining rooms:`, data);
    if (data.userId) socket.join(data.userId);
    if (data.floor) socket.join(data.floor);
  });

  socket.on("join-user-room", (userId) => {
    console.log(`Socket ${socket.id} joining user room: user-${userId}`);
    socket.join(`user-${userId}`);
  });

  socket.on("join-admin-room", () => {
    console.log(`Socket ${socket.id} joining admin room`);
    socket.join("admin-room");
  });

  socket.on("sendMessage", (msg) => {
    console.log("Message received:", msg);
    
    io.to(msg.sender).emit("newMessage", msg);

    if (msg.receiver) io.to(msg.receiver).emit("newMessage", msg);
    if (msg.floor) io.to(msg.floor).emit("newMessage", msg);

    if (msg.receiver === "admin" || msg.sender === "admin") {
      io.to("admin-room").emit("newMessage", msg);
    }

    if (msg.receiver && msg.sender !== msg.receiver) {
      io.to(msg.receiver).emit("unreadCountUpdate", {
        userId: msg.receiver,
        count: 1
      });
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", socket.id, error);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ User disconnected:", socket.id, "Reason:", reason);
  });
});

app.set("io", io);

// =========================
// ✅ ROUTES
// =========================
import newsRoutes from "./routes/newsRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import forgotPasswordRoutes from "./routes/forgotPasswordRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import systemRoutes from "./routes/system.js";
import backupRoutes from "./routes/backupRoutes.js";
import announcementRoutes from "./routes/announcement.js";

app.use("/api/logs", logRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", forgotPasswordRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api", availabilityRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/admin/system", backupRoutes);

// =========================
// ✅ HEALTH CHECK ENDPOINT
// =========================
app.get("/health", (req, res) => {
  res.status(200).json({ 
    success: true,
    status: "OK", 
    message: "Server is running",
    socketIO: "active",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    cors: {
      allowedOrigins,
      currentOrigin: req.headers.origin || "none"
    }
  });
});

// Test endpoint for CORS
app.get("/test-cors", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CORS is working",
    origin: req.headers.origin || "no origin",
    headers: {
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-credentials': res.getHeader('Access-Control-Allow-Credentials')
    }
  });
});

// =========================
// ✅ ERROR HANDLING MIDDLEWARE
// =========================
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
  
  // Set CORS headers even for errors
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin.includes("localhost") || origin.includes("vercel.app"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.status(500).json({ 
    success: false, 
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin.includes("localhost") || origin.includes("vercel.app"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// =========================
// ✅ DATABASE + SERVER START
// =========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.IO server is ready on path: /socket.io/`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 Allowed origins:`, allowedOrigins);
      console.log(`📍 Server URL: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });