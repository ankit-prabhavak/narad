import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
} from '@narad/contracts';
import type { ZodType } from 'zod';
import { env } from '../config/env';
import { CSRF_SECRET, csrfTokenFor, SkipCsrf } from '../csrf/csrf';
import { RateLimitService } from '../redis/rate-limit.service';
import { AuthService } from './auth.service';
import { type AuthedRequest, SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { readSessionCookie, SESSION_COOKIE } from './session.token';

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
};

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function parseBody<T>(schema: ZodType<T>, body: unknown, message: string): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'VALIDATION_FAILED',
      message,
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  return parsed.data;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly limiter: RateLimitService,
    @Inject(CSRF_SECRET) private readonly csrfSecret: string,
  ) {}

  @Post('register')
  @SkipCsrf()
  @HttpCode(201)
  async register(@Body() body: unknown, @Req() req: Request) {
    await this.limiter.hit(`register:ip:${req.ip ?? 'unknown'}`, 10, 3600);
    return this.auth.register(
      parseBody(RegisterRequest, body, 'Invalid registration data.'),
    );
  }

  @Post('login')
  @SkipCsrf()
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.limiter.hit(`login:ip:${req.ip ?? 'unknown'}`, 20, 900);
    const input = parseBody(LoginRequest, body, 'Invalid login data.');
    await this.limiter.hit(`login:email:${sha256(input.email)}`, 5, 900);

    const user = await this.auth.login(input);
    const { token, expiresAt } = await this.sessions.create(
      user.id,
      req.get('user-agent'),
    );
    res.cookie(SESSION_COOKIE, token, { ...cookieBase, expires: expiresAt });
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = readSessionCookie(req);
    if (token) await this.sessions.revoke(token);
    res.clearCookie(SESSION_COOKIE, cookieBase);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() req: AuthedRequest) {
    return req.auth?.user;
  }

  @Get('csrf')
  @UseGuards(SessionGuard)
  csrf(@Req() req: Request) {
    const token = readSessionCookie(req);
    return { csrfToken: token ? csrfTokenFor(this.csrfSecret, token) : null };
  }

  @Post('change-password')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  async changePassword(
    @Body() body: unknown,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const auth = req.auth;
    if (!auth)
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Please sign in.',
      });

    await this.limiter.hit(`chpw:user:${auth.user.id}`, 5, 900);
    const input = parseBody(
      ChangePasswordRequest,
      body,
      'Invalid password data.',
    );

    await this.auth.changePassword(
      auth.user.id,
      input.currentPassword,
      input.newPassword,
    );
    await this.sessions.revokeAllForUser(auth.user.id);

    const { token, expiresAt } = await this.sessions.create(
      auth.user.id,
      req.get('user-agent'),
    );
    res.cookie(SESSION_COOKIE, token, { ...cookieBase, expires: expiresAt });
    return { csrfToken: csrfTokenFor(this.csrfSecret, token) };
  }
}
