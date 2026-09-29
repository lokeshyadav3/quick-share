import * as telegramService from '../telegram/telegram.service.js';

export async function upload({ originalName, mimeType, buffer, size, sha256 }) {
  return telegramService.uploadFile({
    originalName,
    mimeType,
    buffer,
    size,
    sha256,
  });
}

export async function download(fileId) {
  return telegramService.downloadFile(fileId);
}

export async function deleteFile(chatId, messageId) {
  return telegramService.deleteFile(chatId, messageId);
}
