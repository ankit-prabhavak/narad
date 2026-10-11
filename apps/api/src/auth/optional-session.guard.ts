import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SessionService } from './session.service';
import { type AuthedRequest } from './session.guard';
import { readSessionCookie } from './session.token';

/** Attaches req.auth when a valid session exists, but never rejects. */
@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = readSessionCookie(req);
    if (token) {
      const auth = await this.sessions.resolve(token);
      if (auth) req.auth = auth;
    }
    return true;
  }
}
