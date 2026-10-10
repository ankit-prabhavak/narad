import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginRequest, RegisterRequest } from '@narad/contracts';
import type { ZodType } from 'zod';
import { env } from '../config/env';
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
  ) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body() body: unknown) {
    return this.auth.register(
      parseBody(RegisterRequest, body, 'Invalid registration data.'),
    );
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.login(
      parseBody(LoginRequest, body, 'Invalid login data.'),
    );
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
}
