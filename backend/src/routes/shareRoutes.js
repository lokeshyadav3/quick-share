import express from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { requireReceiverSession } from '../middleware/auth.js';
import {
  accessShare,
  createShare,
  deleteShare,
  downloadFile,
  healthCheck,
  listFiles,
  uploadMiddleware,
} from '../controllers/shareController.js';
import { createErrorResponse } from '../utils/error.js';

const router = express.Router();

const shareCreateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS || 900000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(createErrorResponse('RATE_LIMITED', 'Too many share creation requests.'));
  },
});

const accessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(createErrorResponse('PASSKEY_RATE_LIMITED', 'Too many passkey verification attempts.'));
  },
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(createErrorResponse('RATE_LIMITED', 'Too many download requests.'));
  },
});

router.get('/health', healthCheck);
router.post('/shares', shareCreateLimiter, uploadMiddleware, createShare);
router.post('/shares/access', accessLimiter, accessShare);
router.get('/shares/files', requireReceiverSession, listFiles);
router.get('/shares/files/:fileId/download', downloadLimiter, requireReceiverSession, downloadFile);
router.delete('/shares', requireReceiverSession, deleteShare);

export default router;
