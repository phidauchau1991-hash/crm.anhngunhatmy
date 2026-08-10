import crypto from 'crypto';

const SECRET = process.env.PARENT_PORTAL_SECRET || 'nhatmy-crm-parent-secret-key-123456';
const ALGORITHM = 'aes-256-cbc';
const KEY = crypto.scryptSync(SECRET, 'salt', 32);
const IV = Buffer.alloc(16, 0); // Static IV for simple deterministic URL tokens

export function encryptStudentId(studentId) {
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
  let encrypted = cipher.update(studentId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decryptStudentId(token) {
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return null;
  }
}
