import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { MeResponse } from '@narad/contracts';
import { SessionService } from './session.service';
import { readSessionCookie } from './session.token';

export type AuthedRequest = Request & {
  auth?: { sessionId: string; user: MeResponse };
};

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = readSessionCookie(req);
    const auth = token ? await this.sessions.resolve(token) : null;
    if (!auth) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Please sign in.',
      });
    }
    req.auth = auth;
    return true;
  }
}
