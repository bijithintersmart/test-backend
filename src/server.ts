import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { env } from "./config/env";
import { connectDb, db } from "./database/db";
import { redisService } from "./services/redis.service";
import { logger } from "./core/logger/logger";

// BullMQ Workers need to be imported so they register and begin processing
import "./jobs/worker";

const port = env.PORT || 3000;
const server = http.createServer(app);

// Initialize Socket.IO Server (Ready for real-time channels)
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  logger.info(`🔌 Real-time client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    logger.info(`🔌 Real-time client disconnected: ${socket.id}`);
  });
});

// Export Socket.IO instance for module injection
export { io };

async function bootstrap() {
  try {
    // 1. Establish database connection
    await connectDb();

    // 2. Establish Redis connection
    redisService.connect();

    // 3. Start HTTP server listening
    server.listen(port, () => {
      logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${port}`);
      logger.info(`📚 Swagger docs available at http://localhost:${port}/docs`);
    });
  } catch (error) {
    logger.fatal(error as Error, "❌ Bootstrap startup failed");
    process.exit(1);
  }
}

// Graceful Shutdown logic
const handleShutdown = async (signal: string) => {
  logger.warn(`🛑 Received ${signal}. Initiating graceful shutdown...`);

  // Close HTTP server to stop accepting new requests
  server.close(() => {
    logger.info("HTTP server closed.");
  });

  try {
    // Disconnect Redis
    await redisService.quit();

    // Disconnect Prisma
    await db.$disconnect();
    logger.info("Database connection closed.");

    logger.info("Graceful shutdown completed. Exiting process.");
    process.exit(0);
  } catch (error) {
    logger.error(error as Error, "Error during graceful shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

bootstrap();
