import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { csrfMatches, csrfTokenFor } from './csrf';
import { CsrfGuard } from './csrf.guard';

const SECRET = 'a'.repeat(64);

function ctx(method: string, cookies: Record<string, string>, header?: string) {
  const req = {
    method,
    cookies,
    get: (name: string) =>
      name.toLowerCase() === 'x-csrf-token' ? header : undefined,
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

const guardWith = (skip: boolean) =>
  new CsrfGuard(
    { getAllAndOverride: () => skip } as unknown as Reflector,
    SECRET,
  );

describe('CSRF token', () => {
  it('is deterministic per session and differs between sessions', () => {
    expect(csrfTokenFor(SECRET, 's1')).toBe(csrfTokenFor(SECRET, 's1'));
    expect(csrfTokenFor(SECRET, 's1')).not.toBe(csrfTokenFor(SECRET, 's2'));
    expect(csrfMatches(SECRET, 's1', csrfTokenFor(SECRET, 's2'))).toBe(false);
  });
});

describe('CsrfGuard', () => {
  const session = { narad_session: 'sess-token' };

  it('allows safe methods without a token', () => {
    expect(guardWith(false).canActivate(ctx('GET', session))).toBe(true);
  });

  it('allows unsafe requests that carry no session cookie', () => {
    expect(guardWith(false).canActivate(ctx('POST', {}))).toBe(true);
  });

  it('allows routes marked SkipCsrf', () => {
    expect(guardWith(true).canActivate(ctx('POST', session))).toBe(true);
  });

  it('rejects an unsafe request with a session but no token', () => {
    expect(() => guardWith(false).canActivate(ctx('POST', session))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a wrong token', () => {
    expect(() =>
      guardWith(false).canActivate(ctx('POST', session, 'nope')),
    ).toThrow(ForbiddenException);
  });

  it('accepts the correct token', () => {
    const token = csrfTokenFor(SECRET, 'sess-token');
    expect(guardWith(false).canActivate(ctx('DELETE', session, token))).toBe(
      true,
    );
  });
});
