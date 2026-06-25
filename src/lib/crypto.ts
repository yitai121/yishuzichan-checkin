import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 'yishu-checkin-default-secret-2024!';
  // Derive a 32-byte key from the secret using a simple hash
  const key = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    key[i] = secret.charCodeAt(i % secret.length) ^ (i * 7 + 13);
  }
  return key;
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns a base64url-encoded string: iv:ciphertext:tag
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64url');
  encrypted += cipher.final('base64url');
  const tag = cipher.getAuthTag().toString('base64url');

  // Format: iv.encrypted.tag (using . as separator, all base64url)
  return `${iv.toString('base64url')}.${encrypted}.${tag}`;
}

/**
 * Decrypt a base64url-encoded encrypted string
 * Input format: iv:ciphertext:tag
 */
export function decrypt(encoded: string): string | null {
  try {
    const parts = encoded.split('.');
    if (parts.length !== 3) return null;

    const [ivB64, encryptedB64, tagB64] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');

    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) return null;

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedB64, 'base64url', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Generate an encrypted QR token containing signin_code and attendee_id
 */
export function generateQRToken(signinCode: string, attendeeId: string): string {
  const payload = JSON.stringify({
    code: signinCode,
    aid: attendeeId,
    ts: Date.now(),
  });
  return encrypt(payload);
}

/**
 * Verify and decrypt a QR token, returning the payload or null if invalid
 */
export function verifyQRToken(token: string): { code: string; aid: string; ts: number } | null {
  const decrypted = decrypt(token);
  if (!decrypted) return null;

  try {
    const payload = JSON.parse(decrypted);
    if (!payload.code || !payload.aid) return null;

    // Optional: check token age (reject tokens older than 24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (payload.ts && Date.now() - payload.ts > maxAge) {
      return null; // Token expired
    }

    return { code: payload.code, aid: payload.aid, ts: payload.ts };
  } catch {
    return null;
  }
}

/**
 * Generate a random sign-in code (8 chars, URL-safe)
 */
export function generateSigninCode(): string {
  return randomBytes(6).toString('base64url');
}
