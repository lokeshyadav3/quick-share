import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import shareRoutes from './routes/shareRoutes.js';

export function createApp() {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.requestId,
      customLogLevel: (req, res) => (res.statusCode >= 500 ? 'error' : 'info'),
      customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    }),
  );

  const corsOrigin = env.FRONTEND_URL || 'http://localhost:5173';
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
  );

  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'https://api.telegram.org'],
      },
    },
  }));

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(cookieParser());

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use('/api', shareRoutes);

  app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' } });
  });

  app.use(errorHandler);

  return app;
}
