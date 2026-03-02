// server.js
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

// Import User model for socket authentication
import User from "./models/User.js";

const app = express();
const server = http.createServer(app);

// CORS Configuration
app.use(cors({
  origin: [
    "https://usa-circulink.vercel.app",
    "https://circulink-admin.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true
}));

app.use(express.json());

// ✅ Define Socket.io with authentication middleware
const io = new Server(server, {
  cors: {
    origin: [
      "https://usa-circulink.vercel.app",
      "https://circulink-admin.vercel.app",
      "http://localhost:5173",
      "http://localhost:5174"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  transports: ["polling", "websocket"]
});

// ✅ Socket.io Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      // Allow connection but with limited access (not authenticated)
      socket.user = null;
      return next();
    }

    // Find user by session token
    const user = await User.findOne({ sessionToken: token });
    
    if (!user) {
      // Invalid token, but still allow connection (just without auth)
      socket.user = null;
      return next();
    }

    // Check if user is archived or suspended
    if (user.archived || user.suspended) {
      socket.user = null;
      return next();
    }

    // Attach user to socket
    socket.user = {
      _id: user._id.toString(),
      name: user.name,
      role: user.role,
      email: user.email,
      id_number: user.id_number,
      sessionToken: token
    };

    console.log(`✅ Socket authenticated for user: ${user.name} (${user.role})`);
    next();
  } catch (error) {
    console.error("❌ Socket authentication error:", error);
    next(new Error("Authentication error"));
  }
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

// ✅ FIXED: Improved Socket.IO events for real-time messaging with session support
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);
  
  // Join user's personal room if authenticated
  if (socket.user) {
    // Join user's personal room (using user ID)
    socket.join(socket.user._id.toString());
    console.log(`👤 User ${socket.user.name} joined personal room: ${socket.user._id}`);
    
    // Join session token room for force logout
    socket.join(socket.user.sessionToken);
    console.log(`🔐 User joined session room: ${socket.user.sessionToken.substring(0, 10)}...`);
    
    // Join role-based room
    socket.join(socket.user.role.toLowerCase());
    console.log(`👥 User joined role room: ${socket.user.role.toLowerCase()}`);
  }

  // Handle join events
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

  // ✅ Handle join session room for force logout
  socket.on("join-session-room", (sessionToken) => {
    socket.join(sessionToken);
    console.log(`🔐 Socket ${socket.id} joined session room: ${sessionToken.substring(0, 10)}...`);
  });

  // Handle when staff marks conversation as read
  socket.on("markConversationRead", (data) => {
    console.log("📋 Conversation marked as read:", data);
    
    // Broadcast to relevant rooms
    if (data.staffId) {
      io.to(data.staffId).emit("conversationRead", data);
    }
    if (data.userId) {
      io.to(data.userId).emit("conversationRead", data);
    }
  });

  // Handle when staff sends a message (to update unread counts)
  socket.on("staffMessageSent", (data) => {
    console.log("📨 Staff message sent:", data);
    
    // Notify floor room that unread counts should be updated
    if (data.floor) {
      io.to(data.floor).emit("refreshFloorUnreadCounts", data);
    }
    
    // Notify staff that their unread count for this user should be 0
    if (data.staffId && data.userId) {
      io.to(data.staffId).emit("conversationUnreadUpdate", {
        staffId: data.staffId,
        userId: data.userId,
        count: 0
      });
    }
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
    
    // Emit unread count updates
    if (msg.receiver && msg.sender !== msg.receiver) {
      io.to(msg.receiver).emit("unreadCountUpdate", {
        userId: msg.receiver,
        count: 1 // This should be calculated from DB in production
      });
    }
  });

  // Handle unread count updates
  socket.on("updateUnreadCount", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("unreadCountUpdate", data);
    }
  });

  // ✅ Handle message sent confirmation
  socket.on("messageSent", (msg) => {
    console.log("✅ Message sent confirmation received:", msg);
    
    // Send confirmation back to sender
    io.to(msg.sender).emit("messageSent", msg);
    
    // Also send to receiver if needed
    if (msg.receiver && msg.receiver !== msg.sender) {
      io.to(msg.receiver).emit("messageSent", msg);
    }
  });

  // Handle conversation-specific unread updates
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

  // Handle refresh unread counts
  socket.on("refreshUnreadCounts", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("refresh-unread-counts", data);
    }
  });

  // ✅ Handle user verification notifications
  socket.on("join-user-verification-room", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`✅ User ${userId} joined verification room`);
  });

  // Handle floor unread count refresh
  socket.on("refreshFloorUnreadCounts", (data) => {
    if (data.floor) {
      io.to(data.floor).emit("refreshFloorUnreadCounts", data);
      console.log(`🔄 Refreshing unread counts for floor: ${data.floor}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    
    // Clean up any rooms or data if needed
    if (socket.user) {
      console.log(`👋 User ${socket.user.name} disconnected`);
    }
  });
});

// Make io accessible to routes
app.set("io", io);

// ✅ FIXED: Consistent API routes
app.use("/api/logs", logRoutes);
app.use("/api/news", newsRoutes);
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
        
        console.log(`🔍 Internal check running at: ${currentTime}`);
        
        // Find reservations that have ended but are still marked as active
        const expiredReservations = await Reservation.find({
          endDatetime: { $lt: currentTime },
          status: { $in: ["Pending", "Approved", "Ongoing"] }
        });

        console.log(`📊 Found ${expiredReservations.length} expired reservations`);

        // Update expired reservations to 'Expired' status
        if (expiredReservations.length > 0) {
          const reservationIds = expiredReservations.map(res => res._id);
          const updateResult = await Reservation.updateMany(
            { _id: { $in: reservationIds } },
            { $set: { status: "Expired" } }
          );
          
          console.log(`✅ Auto-expired ${updateResult.modifiedCount} expired reservations`);
          
          // Log details of expired reservations
          expiredReservations.forEach(res => {
            console.log(`  - ${res.roomName} (${res.date}) - Status was: ${res.status}`);
          });
          
          return { success: true, expired: updateResult.modifiedCount };
        }

        console.log("✅ No expired reservations found");
        return { success: true, expired: 0 };
      } catch (error) {
        console.error("❌ Internal check expired error:", error);
        return { success: false, error: error.message };
      }
    }

    // CRON job to check expired reservations - FIXED
    cron.schedule("*/5 * * * *", async () => {
      try {
        console.log("🔄 Running scheduled expired reservation check...");
        
        // Use process.env instead of import.meta.env
        const baseUrl = process.env.VITE_API_URL || `http://localhost:${process.env.PORT || 5000}`;
        
        // Try API route first
        const { data } = await axios.post(
          `${baseUrl}/api/reservations/check-expired`
        );
        console.log(`✅ Expired reservations checked via API: ${data.message}`);
      } catch (err) {
        console.error("❌ CRON job API error:", err.message);
        
        // Fallback to internal function if API fails
        console.log("⚠️ API route failed, using internal function");
        const result = await checkExpiredReservationsInternal();
        if (result.success) {
          console.log(`✅ Expired reservations checked internally: ${result.expired} expired`);
        } else {
          console.error("❌ Internal check also failed:", result.error);
        }
      }
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log("\n🚀 ===== SERVER STARTED =====\n");
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ CORS configured for all methods (GET, POST, PUT, DELETE, PATCH)`);
      console.log(`✅ Socket.IO with polling + websocket transports`);
      console.log(`✅ Socket.IO authentication middleware enabled`);
      console.log(`✅ Single-device login support enabled`);
      console.log(`✅ Real-time messaging enabled with improved room handling`);
      console.log(`✅ Auto-expired reservation checker running every 5 minutes`);
      console.log(`✅ WebSocket (io) attached to all requests`);
      console.log(`✅ All routes now use consistent /api prefix`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Log all registered routes for debugging
      console.log("\n📋 Registered Routes:");
      const routes = [
        "/api/users",
        "/api/users/login",
        "/api/users/logout/:userId",
        "/api/users/validate-session",
        "/api/users/search/users",
        "/api/reservations",
        "/api/reservations/admin-create",
        "/api/rooms",
        "/api/messages",
        "/api/notifications",
        "/api/admin",
        "/api/auth",
        "/api/announcements",
        "/api/analytics",
        "/api/logs",
        "/api/news",
        "/api/reports",
        "/api/system"
      ];
      routes.forEach(route => console.log(`  ✅ ${route}`));
      console.log("\n📊 Socket.IO Events:");
      console.log("  ✅ force-logout - Emitted when user is logged out from another device");
      console.log("  ✅ join-session-room - Client joins session-specific room");
      console.log("  ✅ sendMessage - Real-time messaging");
      console.log("  ✅ newMessage - Broadcast new messages");
      console.log("  ✅ notification-read - Mark notifications as read");
      console.log("\n================================\n");
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("Error details:", err);
    process.exit(1);
  });