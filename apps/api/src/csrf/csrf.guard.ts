import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { readSessionCookie } from '../auth/session.token';
import { CSRF_SECRET, csrfMatches, SKIP_CSRF } from './csrf';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CSRF_SECRET) private readonly secret: string,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    if (
      this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    ) {
      return true;
    }
    const sessionToken = readSessionCookie(req);
    if (!sessionToken) return true; // no session cookie, nothing for an attacker to ride on
    const provided = req.get('x-csrf-token');
    if (!provided || !csrfMatches(this.secret, sessionToken, provided)) {
      throw new ForbiddenException({
        code: 'CSRF_FAILED',
        message: 'Missing or invalid CSRF token.',
      });
    }
    return true;
  }
}
