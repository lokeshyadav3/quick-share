import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePasskey, getExpirationFromValue, hashPasskey, validatePasskey } from '../src/utils/passkey.js';

test('generatePasskey creates a six-character alphanumeric code', () => {
  const passkey = generatePasskey();
  assert.equal(passkey.length, 6);
  assert.match(passkey, /^[A-Za-z0-9]{6}$/);
});

test('validatePasskey accepts valid values and rejects invalid values', () => {
  assert.equal(validatePasskey('A7kP2x'), true);
  assert.equal(validatePasskey('Q7KM-82'), false);
  assert.equal(validatePasskey('ABC1234'), false);
});

test('hashPasskey creates a fixed-size hash', () => {
  const hashed = hashPasskey('A7kP2x');
  assert.equal(typeof hashed, 'string');
  assert.equal(hashed.length, 64);
  assert.match(hashed, /^[a-f0-9]+$/);
});

test('allowed expiration values are enforced', () => {
  assert.equal(getExpirationFromValue(15 * 60 * 1000), 15 * 60 * 1000);
  assert.equal(getExpirationFromValue(42 * 60 * 1000), null);
});
