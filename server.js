import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import uploadRoutes from "./routes/upload.js";
import retrieveRoutes from "./routes/retrieve.js";
import downloadRoutes from "./routes/download.js";
import statsRoutes from "./routes/stats.js";

// Import models
import Share from "./models/Share.js";
import { uploadsDir } from "./middleware/fileUpload.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/shareonair";

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files
app.use("/uploads", express.static(uploadsDir));

// MongoDB connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    console.log(`📊 Database: ${MONGODB_URI}`);
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// Clean up expired shares every hour
const cleanupExpiredShares = async () => {
  try {
    const result = await Share.cleanupExpired();
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} expired shares`);
    }
  } catch (error) {
    console.error("Error cleaning up expired shares:", error);
  }
};
setInterval(cleanupExpiredShares, 60 * 60 * 1000);

// Health check route
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    server: "ShareOnAir API v2.0",
    database: "MongoDB",
    uptime: process.uptime(),
  });
});

// API Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/retrieve", retrieveRoutes);
app.use("/api/download", downloadRoutes);
app.use("/api/stats", statsRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);

  if (error.name === "MulterError") {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large. Maximum size is 50MB",
      });
    }
    return res.status(400).json({
      error: `Upload error: ${error.message}`,
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: `Validation error: ${error.message}`,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      error: "Invalid data format",
    });
  }

  res.status(500).json({
    error: "Internal server error",
  });
});

// 404 route
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("\n🔄 Shutting down server...");
  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
  } catch (error) {
    console.error("❌ Error closing MongoDB connection:", error);
  }
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// ✅ Export for Vercel
export default app;

// ✅ Run server only during local development
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 ShareOnAir Server v2.0 running on port ${PORT}`);
    console.log(`📁 Upload directory: ${uploadsDir}`);
    console.log(`🌐 API endpoints:`);
    console.log(`   - POST /api/upload`);
    console.log(`   - GET  /api/retrieve/:code`);
    console.log(`   - GET  /api/download/:code`);
    console.log(`   - GET  /api/stats`);
    console.log(`\n💡 Make sure MongoDB is running on: ${MONGODB_URI}`);
  });
}
