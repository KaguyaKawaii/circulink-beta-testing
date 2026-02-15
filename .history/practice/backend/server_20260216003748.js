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
import analyticsRoutes from "./routes/analyticsRoutes.js"; // ✅ ADDED missing analytics routes

const app = express();
const server = http.createServer(app);

// CORS Configuration - FIXED: Added localhost for development
const allowedOrigins = [
  "https://usa-circulink.vercel.app",
  "https://circulink-admin.vercel.app",
  "http://localhost:5173",  // ✅ Added for local development
  "http://localhost:3000"    // ✅ Added for local development
];

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
  credentials: true
}));

app.use(express.json({ limit: '50mb' })); // ✅ Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Define Socket.io with improved configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  },
  transports: ["polling", "websocket"],
  pingTimeout: 60000, // ✅ Increased timeout
  pingInterval: 25000
});

// ✅ Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Static file serving with proper error handling
app.use(
  "/uploads/profile-pictures",
  express.static(path.join(__dirname, "uploads", "profile-pictures"), {
    fallthrough: false,
    setHeaders: (res, path) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  })
);
app.use("/uploads/news", express.static(path.join(__dirname, "uploads", "news"), {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Serve backup files statically
app.use("/backups", express.static(path.join(__dirname, "backups"), {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// ✅ FIXED: Improved Socket.IO events for real-time messaging
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Handle general join event
  socket.on("join", (data) => {
    if (data.userId) {
      socket.join(data.userId);
      console.log(`👤 User ${data.userId} joined room: ${data.userId}`);
    }
    
    if (data.floor) {
      socket.join(data.floor);
      console.log(`🏢 User joined floor room: ${data.floor}`);
    }

    if (data.role === 'admin') {
      socket.join('admin-room');
      console.log(`👨‍💼 Admin joined admin room`);
    }
  });

  socket.on("join-user-room", (userId) => {
    socket.join(userId); // ✅ Use userId directly, not prefixed
    console.log(`👤 User ${userId} joined personal room`);
  });

  socket.on("join-admin-room", () => {
    socket.join("admin-room");
    console.log(`👨‍💼 Admin joined admin room: ${socket.id}`);
  });

  // Handle mark conversation as read
  socket.on("markConversationRead", (data) => {
    console.log("📋 Conversation marked as read:", data);
    
    if (data.staffId) {
      io.to(data.staffId).emit("conversationRead", data);
    }
    if (data.userId) {
      io.to(data.userId).emit("conversationRead", data);
    }
  });

  // Handle staff message sent
  socket.on("staffMessageSent", (data) => {
    console.log("📨 Staff message sent:", data);
    
    if (data.floor) {
      io.to(data.floor).emit("refreshFloorUnreadCounts", data);
    }
    
    if (data.staffId && data.userId) {
      io.to(data.staffId).emit("conversationUnreadUpdate", {
        staffId: data.staffId,
        userId: data.userId,
        count: 0
      });
    }
  });

  // ✅ FIXED: Improved message handling
  socket.on("sendMessage", (msg) => {
    console.log("📨 Message received:", msg);
    
    // Send to sender for confirmation
    io.to(msg.sender).emit("newMessage", msg);
    
    // Send to receiver
    if (msg.receiver) {
      io.to(msg.receiver).emit("newMessage", msg);
      console.log(`📨 Message sent to receiver: ${msg.receiver}`);
    }
    
    // Send to floor if it's a floor message
    if (msg.floor && msg.receiver !== msg.floor) {
      io.to(msg.floor).emit("newMessage", msg);
      console.log(`📢 Message broadcast to floor: ${msg.floor}`);
    }
    
    // Send to admin if it's for admin
    if (msg.receiver === "admin-room" || msg.sender === "admin-room") {
      io.to("admin-room").emit("newMessage", msg);
    }
    
    // Trigger unread count update
    if (msg.receiver && msg.sender !== msg.receiver) {
      io.to(msg.receiver).emit("unreadCountUpdate", {
        userId: msg.receiver,
        conversationWith: msg.sender
      });
    }
  });

  // Handle unread count updates
  socket.on("updateUnreadCount", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("unreadCountUpdate", data);
    }
  });

  // Handle message sent confirmation
  socket.on("messageSent", (msg) => {
    console.log("✅ Message sent confirmation received:", msg);
    io.to(msg.sender).emit("messageSent", msg);
    
    if (msg.receiver && msg.receiver !== msg.sender) {
      io.to(msg.receiver).emit("messageSent", msg);
    }
  });

  // Handle conversation unread updates
  socket.on("updateConversationUnread", (data) => {
    if (data.staffId) {
      io.to(data.staffId).emit("conversationUnreadUpdate", data);
    }
    if (data.userId) {
      io.to(data.userId).emit("conversationUnreadUpdate", data);
    }
  });

  // Handle notification read
  socket.on("notification-read", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("notifications-read", data);
    }
  });

  // Handle all notifications read
  socket.on("all-notifications-read", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("notifications-read", data);
    }
  });

  // Handle refresh unread counts
  socket.on("refreshUnreadCounts", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("refresh-unread-counts", data);
    }
  });

  // Handle user verification notifications
  socket.on("join-user-verification-room", (userId) => {
    socket.join(userId);
    console.log(`✅ User ${userId} joined verification room`);
  });

  // Handle floor unread count refresh
  socket.on("refreshFloorUnreadCounts", (data) => {
    if (data.floor) {
      io.to(data.floor).emit("refreshFloorUnreadCounts", data);
      console.log(`🔄 Refreshing unread counts for floor: ${data.floor}`);
    }
  });

  // Handle typing indicator
  socket.on("typing", (data) => {
    if (data.receiver) {
      io.to(data.receiver).emit("userTyping", {
        userId: data.userId,
        isTyping: data.isTyping
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Make io accessible to routes
app.set("io", io);

// ✅ FIXED: Consistent API routes with proper ordering
app.use("/api/analytics", analyticsRoutes); // ✅ Added analytics routes
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

// ✅ Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database connection + Start Server
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
  })
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
          status: { $in: ["approved", "pending", "ongoing"] }
        });

        // Update expired reservations to 'completed' or 'expired' status
        if (expiredReservations.length > 0) {
          const reservationIds = expiredReservations.map(res => res._id);
          
          // Update to appropriate status based on original status
          for (const reservation of expiredReservations) {
            if (reservation.status === "ongoing") {
              reservation.status = "completed";
            } else {
              reservation.status = "expired";
            }
            await reservation.save();
          }
          
          console.log(`✅ Auto-completed/expired ${expiredReservations.length} reservations`);
          return { success: true, completed: expiredReservations.length };
        }

        console.log("✅ No expired reservations found");
        return { success: true, completed: 0 };
      } catch (error) {
        console.error("❌ Internal check expired error:", error);
        return { success: false, error: error.message };
      }
    }

    // CRON job to check expired reservations - FIXED with better error handling
    cron.schedule("*/5 * * * *", async () => {
      try {
        // Try API route first
        const baseUrl = process.env.VITE_API_URL || `http://localhost:${process.env.PORT || 5000}`;
        const { data } = await axios.post(
          `${baseUrl}/api/reservations/check-expired`,
          {},
          { 
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
          }
        );
        console.log(`✅ Expired reservations checked via API: ${data.message || 'OK'}`);
      } catch (err) {
        console.error("❌ CRON job API error:", err.message);
        
        // Fallback to internal function if API fails
        console.log("⚠️ API route failed, using internal function");
        const result = await checkExpiredReservationsInternal();
        if (result.success) {
          console.log(`✅ Expired reservations checked internally: ${result.completed} processed`);
        }
      }
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ CORS configured for: ${allowedOrigins.join(', ')}`);
      console.log(`✅ Socket.IO with polling + websocket transports`);
      console.log(`✅ Real-time messaging enabled with improved room handling`);
      console.log(`✅ Auto-expired reservation checker running every 5 minutes`);
      console.log(`✅ WebSocket (io) attached to all requests`);
      console.log(`✅ All routes use consistent /api prefix`);
      console.log(`✅ Analytics routes added at /api/analytics`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Don't exit the process, just log
});

export default app;