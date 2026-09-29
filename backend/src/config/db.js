import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info({ uri: env.MONGODB_URI }, 'Connected to MongoDB');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to MongoDB');
    throw error;
  }
}
