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
// ✅ SMART PRODUCTION CORS
// =========================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://usa-circulink.vercel.app",
  "https://circulink-admin.vercel.app",
  "https://circulink-beta-testing.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      // Allow Vercel preview deployments
      if (origin.includes("vercel.app")) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);

app.use(express.json());

// =========================
// ✅ SOCKET.IO CONFIG
// =========================
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (origin.includes("vercel.app")) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback("Not allowed by CORS");
    },
    credentials: true
  },
  transports: ["polling", "websocket"]
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// =========================
// ✅ STATIC FILES
// =========================
app.use(
  "/uploads/profile-pictures",
  express.static(path.join(__dirname, "uploads/profile-pictures"))
);

app.use(
  "/uploads/news",
  express.static(path.join(__dirname, "uploads/news"))
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
    if (data.userId) socket.join(data.userId);
    if (data.floor) socket.join(data.floor);
  });

  socket.on("join-user-room", (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on("join-admin-room", () => {
    socket.join("admin-room");
  });

  socket.on("sendMessage", (msg) => {
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

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
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
// ✅ DATABASE + SERVER START
// =========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
