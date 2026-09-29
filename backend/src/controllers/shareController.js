import crypto from 'node:crypto';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { createReceiverSession, clearReceiverSession } from '../middleware/auth.js';
import Share from '../models/Share.js';
import { upload as uploadToStorage, download as downloadFromStorage, deleteFile as deleteStorageFile } from '../services/storage/storage.service.js';
import { createErrorResponse } from '../utils/error.js';
import { generatePasskey, getExpirationFromValue, hashPasskey, validatePasskey } from '../utils/passkey.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: env.MAX_FILES_PER_SHARE,
  },
});

function sanitizeFileName(fileName) {
  return String(fileName || 'uploaded-file')
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export const uploadMiddleware = upload.array('files', env.MAX_FILES_PER_SHARE);

export async function createShare(req, res, next) {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json(createErrorResponse('UPLOAD_FAILED', 'At least one file is required.'));
    }

    const durationMs = getExpirationFromValue(Number(req.body.expiration));
    if (!durationMs) {
      return res.status(400).json(createErrorResponse('INVALID_EXPIRATION', 'The selected expiration value is invalid.'));
    }

    const savedFiles = [];
    for (const file of files) {
      const safeName = sanitizeFileName(file.originalname);
      const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

      try {
        const telegramMeta = await uploadToStorage({
          originalName: safeName,
          mimeType: file.mimetype || 'application/octet-stream',
          buffer: file.buffer,
          size: file.size,
          sha256,
        });

        savedFiles.push({
          originalName: safeName,
          telegramFileId: telegramMeta.telegramFileId,
          telegramFileUniqueId: telegramMeta.telegramFileUniqueId,
          telegramMessageId: telegramMeta.telegramMessageId,
          telegramChatId: telegramMeta.telegramChatId,
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
          sha256,
          createdAt: new Date(),
        });
      } catch (error) {
        logger.error({ err: error, requestId: req.requestId }, 'Telegram upload failed');
        return res.status(400).json(createErrorResponse('FILE_TOO_LARGE', 'This file exceeds the configured Telegram Bot API limit.'));
      }
    }

    let passkey = '';
    let share = null;
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      passkey = generatePasskey();
      const hash = hashPasskey(passkey);
      const existing = await Share.findOne({ passkeyHash: hash, status: 'ACTIVE' });
      if (!existing) {
        share = new Share({
          passkeyHash: hash,
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + durationMs),
          files: savedFiles,
        });
        break;
      }
    }

    if (!share) {
      return res.status(409).json(createErrorResponse('INVALID_PASSKEY', 'Passkey collision detected. Please try again.'));
    }

    await share.save();

    return res.status(201).json({
      success: true,
      data: {
        passkey,
        expiresAt: share.expiresAt.toISOString(),
        files: savedFiles.map((file) => ({
          id: file._id?.toString?.() || String(Date.now()),
          name: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function accessShare(req, res, next) {
  try {
    const schema = z.object({
      passkey: z.string().regex(/^[A-Za-z0-9]{6}$/),
    });

    const { passkey } = schema.parse(req.body);
    const share = await Share.findOne({
      passkeyHash: hashPasskey(passkey),
      status: 'ACTIVE',
    });

    if (!share) {
      return res.status(404).json(createErrorResponse('INVALID_PASSKEY', 'The Passkey is invalid or has expired.'));
    }

    if (share.expiresAt <= new Date()) {
      share.status = 'EXPIRED';
      await share.save();
      return res.status(410).json(createErrorResponse('SHARE_EXPIRED', 'This share has expired.'));
    }

    const sessionId = createReceiverSession(String(share._id));
    res.cookie('quickshare_session', sessionId, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return res.json({
      success: true,
      data: {
        shareId: share._id,
        expiresAt: share.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(createErrorResponse('INVALID_PASSKEY', 'The Passkey must be exactly six alphanumeric characters.'));
    }
    next(error);
  }
}

export async function listFiles(req, res, next) {
  try {
    const share = await Share.findById(req.receiverSession.shareId);
    if (!share || share.status !== 'ACTIVE') {
      return res.status(404).json(createErrorResponse('SHARE_NOT_FOUND', 'The share could not be found.'));
    }

    if (share.expiresAt <= new Date()) {
      share.status = 'EXPIRED';
      await share.save();
      return res.status(410).json(createErrorResponse('SHARE_EXPIRED', 'This share has expired.'));
    }

    return res.json({
      success: true,
      data: {
        expiresAt: share.expiresAt.toISOString(),
        files: share.files.map((file) => ({
          id: file._id.toString(),
          name: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadFile(req, res, next) {
  try {
    const share = await Share.findById(req.receiverSession.shareId);
    if (!share || share.status !== 'ACTIVE') {
      return res.status(404).json(createErrorResponse('SHARE_NOT_FOUND', 'The share could not be found.'));
    }

    if (share.expiresAt <= new Date()) {
      share.status = 'EXPIRED';
      await share.save();
      return res.status(410).json(createErrorResponse('SHARE_EXPIRED', 'This share has expired.'));
    }

    const fileEntry = share.files.id(req.params.fileId);
    if (!fileEntry) {
      return res.status(404).json(createErrorResponse('FILE_NOT_FOUND', 'The file could not be found.'));
    }

    const fileStream = await downloadFromStorage(fileEntry.telegramFileId);
    share.downloadCount += 1;
    await share.save();

    res.setHeader('Content-Type', fileEntry.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(fileEntry.size));
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFileName(fileEntry.originalName)}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    fileStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json(createErrorResponse('DOWNLOAD_FAILED', 'The file could not be downloaded.'));
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Download failed');
    return res.status(500).json(createErrorResponse('DOWNLOAD_FAILED', 'The file could not be downloaded.'));
  }
}

export async function deleteShare(req, res, next) {
  try {
    const share = await Share.findById(req.receiverSession.shareId);
    if (!share) {
      return res.status(404).json(createErrorResponse('SHARE_NOT_FOUND', 'The share could not be found.'));
    }

    share.status = 'DELETED';
    await share.save();

    for (const file of share.files) {
      try {
        await deleteStorageFile(file.telegramChatId, file.telegramMessageId);
      } catch (error) {
        logger.warn({ err: error }, 'Failed to delete Telegram message during share removal');
      }
    }

    clearReceiverSession(req.cookies?.quickshare_session);
    res.clearCookie('quickshare_session');
    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
}

export function healthCheck(req, res) {
  return res.json({ success: true, data: { status: 'ok' } });
}
