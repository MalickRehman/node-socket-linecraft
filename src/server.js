import { createServer } from "http";
import { config } from "dotenv";
import app, { setupSocketIO } from "./app.js"; // Import setupSocketIO
import logger from "./utils/logger.js";
import { connectDB } from "./config/database.js";

// Load environment variables first
config();

const PORT = process.env.PORT || 4000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO with the server
setupSocketIO(server); // Add this line to initialize Socket.IO

// Connect to MongoDB
connectDB();

// Start the server
server.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(
    `Server accessible at http://localhost:${PORT} and http://192.168.18.28:${PORT}`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

export default server;
