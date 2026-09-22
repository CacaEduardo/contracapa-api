import { randomBytes } from 'node:crypto';

export function generateTemporaryPassword(): string {
  return randomBytes(12).toString('base64url');
}
