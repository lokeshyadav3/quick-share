import dotenv from 'dotenv';

dotenv.config();

function getNumber(value, fallback) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: getNumber(process.env.PORT, 5000),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshare',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  TELEGRAM_API_BASE_URL: process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  MAX_FILE_SIZE_MB: getNumber(process.env.MAX_FILE_SIZE_MB, 50),
  MAX_FILES_PER_SHARE: getNumber(process.env.MAX_FILES_PER_SHARE, 10),
  MAX_PASSKEY_ATTEMPTS: getNumber(process.env.MAX_PASSKEY_ATTEMPTS, 5),
  RATE_LIMIT_WINDOW_MS: getNumber(process.env.RATE_LIMIT_WINDOW_MS, 900000),
  RATE_LIMIT_MAX_REQUESTS: getNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
};
