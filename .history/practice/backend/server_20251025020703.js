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
import backupRoutes from "./routes/backupRoutes.js";
import announcementRoutes from './routes/announcement.js';

const app = express();
const server = http.createServer(app);

// CORS Configuration
app.use(cors({
  origin: [
    "https://circulink-beta-testing.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true
}));

app.use(express.json());

// ✅ Define Socket.io FIRST
const io = new Server(server, {
  cors: {
    origin: [
      "https://circulink-beta-testing.vercel.app"
      "http://localhost:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  transports: ["polling", "websocket"]
});

// ✅ NOW attach io to requests (after io is defined)
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

// Serve backup files statically
app.use("/backups", express.static(path.join(__dirname, "backups")));

// ✅ FIXED: Improved Socket.IO events for real-time messaging
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // FIXED: Handle general join event (used by both frontend components)
  socket.on("join", (data) => {
    if (data.userId) {
      socket.join(data.userId);
      console.log(`👤 User ${data.userId} joined room: ${data.userId}`);
    }
    
    // Also join floor rooms if floor is provided
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

  // FIXED: Improved message handling for all scenarios
  socket.on("sendMessage", (msg) => {
    console.log("📨 Message received:", msg);
    
    // Send to sender
    io.to(msg.sender).emit("newMessage", msg);
    
    // Send to receiver
    if (msg.receiver) {
      io.to(msg.receiver).emit("newMessage", msg);
    }
    
    // Send to floor if it's a floor message
    if (msg.floor) {
      io.to(msg.floor).emit("newMessage", msg);
      console.log(`📢 Message broadcast to floor: ${msg.floor}`);
    }
    
    // Send to admin if it's an admin message
    if (msg.receiver === "admin" || msg.sender === "admin") {
      io.to("admin-room").emit("newMessage", msg);
    }
    
    // FIXED: Emit unread count updates
    if (msg.receiver && msg.sender !== msg.receiver) {
      io.to(msg.receiver).emit("unreadCountUpdate", {
        userId: msg.receiver,
        count: 1 // This should be calculated from DB in production
      });
    }
  });

  // FIXED: Handle unread count updates
  socket.on("updateUnreadCount", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("unreadCountUpdate", data);
    }
  });

  // ✅ ADDED: Handle message sent confirmation
  socket.on("messageSent", (msg) => {
    console.log("✅ Message sent confirmation received:", msg);
    
    // Send confirmation back to sender
    io.to(msg.sender).emit("messageSent", msg);
    
    // Also send to receiver if needed
    if (msg.receiver && msg.receiver !== msg.sender) {
      io.to(msg.receiver).emit("messageSent", msg);
    }
  });

  // FIXED: Handle conversation-specific unread updates
  socket.on("updateConversationUnread", (data) => {
    if (data.staffId) {
      io.to(data.staffId).emit("conversationUnreadUpdate", data);
    }
    if (data.userId) {
      io.to(data.userId).emit("conversationUnreadUpdate", data);
    }
  });

  socket.on("notification-read", (data) => {
    socket.to(`user-${data.userId}`).emit("notifications-read");
  });

  socket.on("all-notifications-read", (data) => {
    socket.to(`user-${data.userId}`).emit("notifications-read");
  });

  // FIXED: Handle refresh unread counts
  socket.on("refreshUnreadCounts", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("refresh-unread-counts", data);
    }
  });

  // ✅ ADDED: Handle user verification notifications
  socket.on("join-user-verification-room", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`✅ User ${userId} joined verification room`);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Make io accessible to routes
app.set("io", io);

// ✅ FIXED: Consistent API routes
app.use("/api/logs", logRoutes);
app.use("/api/news", newsRoutes); // ✅ Added /api
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
app.use("/api/admin/system", backupRoutes);

// Database connection + Start Server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    // Internal function to check expired reservations
    async function checkExpiredReservationsInternal() {
      try {
        const Reservation = (await import("./models/Reservation.js")).default;
        const currentTime = new Date();
        
        // Find reservations that have ended but are still marked as active
        const expiredReservations = await Reservation.find({
          endTime: { $lt: currentTime },
          status: { $in: ["approved", "pending"] }
        });

        // Update expired reservations to 'completed' status
        if (expiredReservations.length > 0) {
          const reservationIds = expiredReservations.map(res => res._id);
          await Reservation.updateMany(
            { _id: { $in: reservationIds } },
            { $set: { status: "completed" } }
          );
          
          console.log(`✅ Auto-completed ${expiredReservations.length} expired reservations`);
          return { success: true, completed: expiredReservations.length };
        }

        console.log("✅ No expired reservations found");
        return { success: true, completed: 0 };
      } catch (error) {
        console.error("❌ Internal check expired error:", error);
        return { success: false, error: error.message };
      }
    }

    // CRON job to check expired reservations - FIXED
    cron.schedule("*/5 * * * *", async () => {
      try {
        // ✅ FIXED: Use process.env instead of import.meta.env
        const baseUrl = process.env.VITE_API_URL || `http://localhost:${process.env.PORT || 5000}`;
        const { data } = await axios.post(
          `${baseUrl}/api/reservations/check-expired`
        );
        console.log(`✅ Expired reservations checked via API: ${data.message}`);
      } catch (err) {
        console.error("❌ CRON job error:", err.message);
        
        // Fallback to internal function if API fails
        console.log("⚠️  API route failed, using internal function");
        const result = await checkExpiredReservationsInternal();
        if (result.success) {
          console.log(`✅ Expired reservations checked internally: ${result.completed} completed`);
        }
      }
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ CORS configured for all methods (GET, POST, PUT, DELETE, PATCH)`);
      console.log(`✅ Socket.IO with polling + websocket transports`);
      console.log(`✅ Real-time messaging enabled with improved room handling`);
      console.log(`✅ Auto-expired reservation checker running every 5 minutes`);
      console.log(`✅ WebSocket (io) attached to all requests`);
      console.log(`✅ All routes now use consistent /api prefix`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });