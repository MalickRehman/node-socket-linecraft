import mongoose from "mongoose";
import logger from "../utils/logger.js";

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    const conn = await mongoose.connect(uri);
    logger.info(
      `MongoDB Connected:${process.env.DB_NAME} on ${conn.connection.host}:${process.env.PORT}`
    );
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
  }
};
