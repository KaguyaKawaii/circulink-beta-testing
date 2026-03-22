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
import closureRoutes from "./routes/closureRoutes.js"; // ✅ ADD THIS IMPORT

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

// ✅ Define Socket.io FIRST
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

// ✅ Socket.IO events (keep your existing socket code)
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

  // Handle when staff marks conversation as read
  socket.on("markConversationRead", (data) => {
    console.log("📋 Conversation marked as read:", data);
    
    if (data.staffId) {
      io.to(data.staffId).emit("conversationRead", data);
    }
    if (data.userId) {
      io.to(data.userId).emit("conversationRead", data);
    }
  });

  // Handle when staff sends a message
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

  // Handle message sending
  socket.on("sendMessage", (msg) => {
    console.log("📨 Message received:", msg);
    
    io.to(msg.sender).emit("newMessage", msg);
    
    if (msg.receiver) {
      io.to(msg.receiver).emit("newMessage", msg);
    }
    
    if (msg.floor) {
      io.to(msg.floor).emit("newMessage", msg);
      console.log(`📢 Message broadcast to floor: ${msg.floor}`);
    }
    
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

  socket.on("updateUnreadCount", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("unreadCountUpdate", data);
    }
  });

  socket.on("messageSent", (msg) => {
    console.log("✅ Message sent confirmation received:", msg);
    
    io.to(msg.sender).emit("messageSent", msg);
    
    if (msg.receiver && msg.receiver !== msg.sender) {
      io.to(msg.receiver).emit("messageSent", msg);
    }
  });

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

  socket.on("refreshUnreadCounts", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("refresh-unread-counts", data);
    }
  });

  socket.on("join-user-verification-room", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`✅ User ${userId} joined verification room`);
  });

  socket.on("refreshFloorUnreadCounts", (data) => {
    if (data.floor) {
      io.to(data.floor).emit("refreshFloorUnreadCounts", data);
      console.log(`🔄 Refreshing unread counts for floor: ${data.floor}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Make io accessible to routes
app.set("io", io);

// ✅ FIXED: Mount news routes at both /news and /api/news for compatibility
app.use("/news", newsRoutes);
app.use("/api/news", newsRoutes);

// ✅ FIXED: Consistent API routes for other modules
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
app.use("/api/closures", closureRoutes); // ✅ ADD THIS LINE - Mount closure routes

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
        
        const expiredReservations = await Reservation.find({
          endDatetime: { $lt: currentTime },
          status: { $in: ["Pending", "Approved", "Ongoing"] }
        });

        console.log(`📊 Found ${expiredReservations.length} expired reservations`);

        if (expiredReservations.length > 0) {
          const reservationIds = expiredReservations.map(res => res._id);
          const updateResult = await Reservation.updateMany(
            { _id: { $in: reservationIds } },
            { $set: { status: "Expired" } }
          );
          
          console.log(`✅ Auto-expired ${updateResult.modifiedCount} expired reservations`);
          
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

    // CRON job to check expired reservations
    cron.schedule("*/5 * * * *", async () => {
      try {
        console.log("🔄 Running scheduled expired reservation check...");
        
        const baseUrl = process.env.VITE_API_URL || `http://localhost:${process.env.PORT || 5000}`;
        
        const { data } = await axios.post(
          `${baseUrl}/api/reservations/check-expired`
        );
        console.log(`✅ Expired reservations checked via API: ${data.message}`);
      } catch (err) {
        console.error("❌ CRON job API error:", err.message);
        
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
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ CORS configured for all methods (GET, POST, PUT, DELETE, PATCH)`);
      console.log(`✅ Socket.IO with polling + websocket transports`);
      console.log(`✅ Real-time messaging enabled with improved room handling`);
      console.log(`✅ Auto-expired reservation checker running every 5 minutes`);
      console.log(`✅ WebSocket (io) attached to all requests`);
      console.log(`✅ All routes now use consistent /api prefix`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Log all registered routes for debugging
      console.log("\n📋 Registered Routes:");
      const routes = [
        "/news (with and without /api)",
        "/api/news (with and without /api)",
        "/api/users",
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
        "/api/reports",
        "/api/system",
        "/api/closures" // ✅ ADD THIS to the routes list
      ];
      routes.forEach(route => console.log(`  ✅ ${route}`));
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("Error details:", err);
    process.exit(1);
  });