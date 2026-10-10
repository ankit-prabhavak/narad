import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import {
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '@narad/contracts';
import { parseBody } from '../common/parse-body';
import { SkipCsrf } from '../csrf/csrf';
import { RateLimitService } from '../redis/rate-limit.service';
import { RecoveryService } from './recovery.service';
import { type AuthedRequest, SessionGuard } from './session.guard';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Controller('auth')
export class RecoveryController {
  private readonly logger = new Logger(RecoveryController.name);

  constructor(
    private readonly recovery: RecoveryService,
    private readonly limiter: RateLimitService,
  ) {}

  @Post('verify-email')
  @SkipCsrf()
  @HttpCode(204)
  async verifyEmail(@Body() body: unknown, @Req() req: Request) {
    await this.limiter.hit(`verify:ip:${req.ip ?? 'unknown'}`, 30, 3600);
    const input = parseBody(
      VerifyEmailRequest,
      body,
      'Invalid verification data.',
    );
    await this.recovery.verifyEmail(input.token);
  }

  @Post('resend-verification')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async resendVerification(@Req() req: AuthedRequest) {
    const auth = req.auth;
    if (!auth) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Please sign in.',
      });
    }
    await this.limiter.hit(`resendverify:user:${auth.user.id}`, 3, 3600);
    await this.recovery.resendVerification(auth.user.id);
  }

  @Post('forgot-password')
  @SkipCsrf()
  @HttpCode(202)
  async forgotPassword(@Body() body: unknown, @Req() req: Request) {
    await this.limiter.hit(`forgot:ip:${req.ip ?? 'unknown'}`, 10, 3600);
    const input = parseBody(ForgotPasswordRequest, body, 'Invalid email.');
    await this.limiter.hit(`forgot:email:${sha256(input.email)}`, 3, 3600);

    // Not awaited: response time must not depend on whether the account exists.
    void this.recovery.requestReset(input.email).catch((err: unknown) => {
      this.logger.error(`Password reset request failed: ${String(err)}`);
    });
    return {
      message: 'If that email has an account, a reset link is on its way.',
    };
  }

  @Post('reset-password')
  @SkipCsrf()
  @HttpCode(204)
  async resetPassword(@Body() body: unknown, @Req() req: Request) {
    await this.limiter.hit(`reset:ip:${req.ip ?? 'unknown'}`, 10, 3600);
    const input = parseBody(ResetPasswordRequest, body, 'Invalid reset data.');
    await this.recovery.resetPassword(input.token, input.newPassword);
  }
}
