import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';
import { startCleanupJob } from './services/cleanup/cleanup.service.js';

const app = createApp();

async function startServer() {
  try {
    await connectDB();
    startCleanupJob();
    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'QuickShare backend started');
    });
  } catch (error) {
    logger.error({ err: error }, 'Server failed to start');
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  startServer();
}

export default app;
