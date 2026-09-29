import crypto from 'node:crypto';
import { createErrorResponse } from '../utils/error.js';

export const receiverSessions = new Map();

export function createReceiverSession(shareId) {
  const sessionId = crypto.randomBytes(24).toString('hex');
  receiverSessions.set(sessionId, {
    shareId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  return sessionId;
}

export function clearReceiverSession(sessionId) {
  receiverSessions.delete(sessionId);
}

export function requireReceiverSession(req, res, next) {
  const sessionId = req.cookies?.quickshare_session;
  const session = sessionId ? receiverSessions.get(sessionId) : null;

  if (!session || session.expiresAt < Date.now()) {
    if (sessionId) {
      clearReceiverSession(sessionId);
    }
    return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'You are not authorized to access this share.'));
  }

  req.receiverSession = session;
  next();
}
