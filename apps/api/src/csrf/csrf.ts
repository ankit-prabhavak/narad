import { createHmac, timingSafeEqual } from 'node:crypto';
import { SetMetadata } from '@nestjs/common';

export const CSRF_SECRET = Symbol('CSRF_SECRET');
export const SKIP_CSRF = 'skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF, true);

export const csrfTokenFor = (secret: string, sessionToken: string): string =>
  createHmac('sha256', secret).update(sessionToken).digest('base64url');

export function csrfMatches(
  secret: string,
  sessionToken: string,
  provided: string,
): boolean {
  const expected = Buffer.from(csrfTokenFor(secret, sessionToken));
  const given = Buffer.from(provided);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
