import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'node:stream';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

function getTelegramApi() {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('Telegram bot token is not configured.');
  }

  return axios.create({
    baseURL: `${env.TELEGRAM_API_BASE_URL}/bot${token}`,
    timeout: 30000,
  });
}

export async function uploadFile({ originalName, mimeType, buffer, size }) {
  if (!env.TELEGRAM_CHAT_ID) {
    throw new Error('Telegram chat id is not configured.');
  }

  const api = getTelegramApi();
  const formData = new FormData();
  formData.append('chat_id', String(env.TELEGRAM_CHAT_ID));
  formData.append('document', Readable.from(buffer), {
    filename: originalName,
    contentType: mimeType || 'application/octet-stream',
  });

  const response = await api.post('/sendDocument', formData, {
    headers: {
      ...formData.getHeaders(),
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const result = response.data?.result;
  if (!result) {
    throw new Error('Telegram upload failed.');
  }

  return {
    telegramFileId: result.document?.file_id || result.file_id || '',
    telegramFileUniqueId: result.document?.file_unique_id || result.file_unique_id || '',
    telegramMessageId: Number(result.message_id),
    telegramChatId: Number(result.chat?.id || env.TELEGRAM_CHAT_ID),
  };
}

export async function getFile(fileId) {
  const api = getTelegramApi();
  const response = await api.get('/getFile', {
    params: { file_id: fileId },
  });

  const fileData = response.data?.result;
  if (!fileData) {
    throw new Error('Telegram file lookup failed.');
  }

  return fileData;
}

export async function downloadFile(fileId) {
  const fileData = await getFile(fileId);
  const filePath = fileData.file_path;
  const api = getTelegramApi();
  const downloadUrl = `${env.TELEGRAM_API_BASE_URL}/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  const response = await axios.get(downloadUrl, {
    responseType: 'stream',
    timeout: 60000,
  });

  return response.data;
}

export async function deleteMessage(chatId, messageId) {
  const api = getTelegramApi();
  const response = await api.post('/deleteMessage', {
    chat_id: Number(chatId),
    message_id: Number(messageId),
  });

  return response.data?.ok === true;
}

export async function deleteFile(chatId, messageId) {
  try {
    return await deleteMessage(chatId, messageId);
  } catch (error) {
    logger.warn({ err: error, chatId, messageId }, 'Telegram deletion failed');
    return false;
  }
}
