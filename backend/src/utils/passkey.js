import crypto from 'node:crypto';

const PASSKEY_PATTERN = /^[A-Za-z0-9]{6}$/;
const EXPIRATION_VALUES_MS = new Set([
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
]);

export function generatePasskey() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let passkey = '';

  for (let i = 0; i < 6; i += 1) {
    const index = crypto.randomInt(0, alphabet.length);
    passkey += alphabet[index];
  }

  return passkey;
}

export function hashPasskey(passkey) {
  return crypto.createHash('sha256').update(String(passkey)).digest('hex');
}

export function validatePasskey(passkey) {
  return typeof passkey === 'string' && PASSKEY_PATTERN.test(passkey);
}

export function getAllowedExpirationMs() {
  return [...EXPIRATION_VALUES_MS];
}

export function getExpirationFromValue(value) {
  const milliseconds = Number(value);
  if (!EXPIRATION_VALUES_MS.has(milliseconds)) {
    return null;
  }

  return milliseconds;
}

export function getExpiresAtFromDuration(durationMs) {
  return new Date(Date.now() + durationMs);
}
