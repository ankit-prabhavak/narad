import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';

export const SESSION_COOKIE = 'narad_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export function readSessionCookie(req: Request): string | null {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const value = cookies?.[SESSION_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
