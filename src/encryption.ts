import * as crypto from 'crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 10000;
const IV_LENGTH = 12;

export function encrypt(password: string, content: string) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('wallet'));
  const encrypted = Buffer.concat([cipher.update(content, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]);
}

export function decrypt(password: string, content: Buffer) {
  const salt = content.subarray(0, SALT_LENGTH);
  const iv = content.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = content.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16); // Auth tag is 16 bytes
  const encrypted = content.subarray(SALT_LENGTH + IV_LENGTH + 16);
  
  const key = deriveKey(password, salt);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from('wallet'));
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf-8');
}

function deriveKey(password: string, salt: Buffer) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}
