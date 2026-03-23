// server.js - Updated CORS configuration
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";
import cron from "node-cron";
import path from "path";
import { fileURLToPath } from "url";

// ES module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
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
import announcementRoutes from './routes/announcement.js';
import analyticsRoutes from "./routes/analyticsRoutes.js";
import closureRoutes from "./routes/closureRoutes.js";

const app = express();
const server = http.createServer(app);

// Allowed origins
const allowedOrigins = [
  "https://usa-circulink.vercel.app",
  "https://circulink-admin.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174"
];

// CORS Configuration for Express
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// ✅ Socket.io with proper CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// ✅ Attach io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Static file serving
app.use(
  "/uploads/profile-pictures",
  express.static(path.join(__dirname, "uploads", "profile-pictures"))
);
app.use("/uploads/news", express.static(path.join(__dirname, "uploads", "news")));

// ✅ Socket.IO events
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Handle join event
  socket.on("join", (data) => {
    if (data.userId) {
      socket.join(data.userId);
      console.log(`👤 User ${data.userId} joined room: ${data.userId}`);
    }
    
    if (data.floor) {
      socket.join(data.floor);
      console.log(`🏢 User joined floor room: ${data.floor}`);
    }
  });

  socket.on("join-user-room", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined room: user-${userId}`);
  });

  socket.on("join-admin-room", () => {
    socket.join("admin-room");
    console.log(`👨‍💼 Admin joined admin room: ${socket.id}`);
  });

  socket.on("join_admin_logs", () => {
    socket.join("admin-logs");
    console.log(`📝 Admin joined logs room: ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Make io accessible to routes
app.set("io", io);

// Mount routes
app.use("/news", newsRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/messages", messageRoutes);
app.use('/api/reservations', reservationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", forgotPasswordRoutes);
app.use('/api/rooms', roomRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api", availabilityRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/closures", closureRoutes);

// Database connection + Start Server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ CORS configured for all methods`);
      console.log(`✅ Socket.IO with polling + websocket transports`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });