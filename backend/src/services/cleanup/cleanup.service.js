import cron from 'node-cron';
import { logger } from '../../config/logger.js';
import Share from '../../models/Share.js';
import { deleteFile } from '../storage/storage.service.js';

export function startCleanupJob() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const expiredShares = await Share.find({
        status: 'ACTIVE',
        expiresAt: { $lte: new Date() },
      });

      for (const share of expiredShares) {
        for (const file of share.files) {
          try {
            await deleteFile(file.telegramChatId, file.telegramMessageId);
          } catch (error) {
            logger.warn(
              { shareId: share._id.toString(), fileId: file._id.toString(), error },
              'Telegram cleanup failed for one file',
            );
          }
        }

        share.status = 'EXPIRED';
        await share.save();
      }
    } catch (error) {
      logger.error({ err: error }, 'Cleanup job failed');
    }
  });

  logger.info('Cleanup job started');
}
