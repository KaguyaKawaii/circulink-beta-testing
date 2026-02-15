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

const app = express();
const server = http.createServer(app);

// ✅ Detect environment
const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = isProduction
  ? [
      "https://usa-circulink.vercel.app",
      "https://circulink-admin.vercel.app"
    ]
  : [
      "http://localhost:5173",
      "http://localhost:5174"
    ];

// =========================
// ✅ CORS CONFIG
// =========================
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true
}));

app.use(express.json());

// =========================
// ✅ SOCKET.IO CONFIG
// =========================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  transports: ["polling", "websocket"]
});

// Attach io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// =========================
// ✅ STATIC FILES
// =========================
app.use(
  "/uploads/profile-pictures",
  express.static(path.join(__dirname, "uploads", "profile-pictures"))
);

app.use(
  "/uploads/news",
  express.static(path.join(__dirname, "uploads", "news"))
);

app.use(
  "/backups",
  express.static(path.join(__dirname, "backups"))
);

// =========================
// ✅ SOCKET EVENTS
// =========================
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("join", (data) => {
    if (data.userId) {
      socket.join(data.userId);
      console.log(`👤 User ${data.userId} joined`);
    }

    if (data.floor) {
      socket.join(data.floor);
      console.log(`🏢 Joined floor ${data.floor}`);
    }
  });

  socket.on("join-user-room", (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on("join-admin-room", () => {
    socket.join("admin-room");
  });

  socket.on("markConversationRead", (data) => {
    if (data.staffId) io.to(data.staffId).emit("conversationRead", data);
    if (data.userId) io.to(data.userId).emit("conversationRead", data);
  });

  socket.on("staffMessageSent", (data) => {
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

  socket.on("sendMessage", (msg) => {
    io.to(msg.sender).emit("newMessage", msg);

    if (msg.receiver) {
      io.to(msg.receiver).emit("newMessage", msg);
    }

    if (msg.floor) {
      io.to(msg.floor).emit("newMessage", msg);
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
    io.to(msg.sender).emit("messageSent", msg);
    if (msg.receiver && msg.receiver !== msg.sender) {
      io.to(msg.receiver).emit("messageSent", msg);
    }
  });

  socket.on("updateConversationUnread", (data) => {
    if (data.staffId) io.to(data.staffId).emit("conversationUnreadUpdate", data);
    if (data.userId) io.to(data.userId).emit("conversationUnreadUpdate", data);
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
  });

  socket.on("refreshFloorUnreadCounts", (data) => {
    if (data.floor) {
      io.to(data.floor).emit("refreshFloorUnreadCounts", data);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Make io accessible to routes
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
// ✅ DATABASE + SERVER START
// =========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    async function checkExpiredReservationsInternal() {
      try {
        const Reservation = (await import("./models/Reservation.js")).default;
        const currentTime = new Date();

        const expiredReservations = await Reservation.find({
          endTime: { $lt: currentTime },
          status: { $in: ["approved", "pending"] }
        });

        if (expiredReservations.length > 0) {
          const reservationIds = expiredReservations.map(r => r._id);

          await Reservation.updateMany(
            { _id: { $in: reservationIds } },
            { $set: { status: "completed" } }
          );

          return { success: true, completed: expiredReservations.length };
        }

        return { success: true, completed: 0 };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }

    cron.schedule("*/5 * * * *", async () => {
      try {
        const baseUrl = isProduction
          ? process.env.VITE_API_URL
          : `http://localhost:${process.env.PORT}`;

        await axios.post(`${baseUrl}/api/reservations/check-expired`);
      } catch (err) {
        await checkExpiredReservationsInternal();
      }
    });

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
