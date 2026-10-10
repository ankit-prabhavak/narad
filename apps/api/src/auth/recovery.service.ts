import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import type { Model } from 'mongoose';
import { MAILER, type Mailer } from '../mail/mailer';
import { User } from '../users/user.schema';
import { ChallengeService } from './challenge.service';
import { SessionService } from './session.service';

export const WEB_ORIGIN = Symbol('WEB_ORIGIN');

const invalidToken = () =>
  new BadRequestException({
    code: 'INVALID_TOKEN',
    message: 'This link is invalid or has expired.',
  });

@Injectable()
export class RecoveryService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly challenges: ChallengeService,
    private readonly sessions: SessionService,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(WEB_ORIGIN) private readonly webOrigin: string,
  ) {}

  async sendVerification(userId: string, email: string): Promise<void> {
    const token = await this.challenges.issue(userId, 'email_verify');
    await this.mailer.send({
      to: email,
      subject: 'Verify your NARAD email',
      text:
        `Open this link to verify your email (valid for 24 hours):\n` +
        `${this.webOrigin}/verify-email?token=${token}\n\n` +
        `If you did not create a NARAD account, you can ignore this message.`,
    });
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.users.findById(userId).exec();
    if (!user || user.emailVerified) return;
    await this.sendVerification(userId, user.email);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.challenges.consume(token, 'email_verify');
    if (!userId) throw invalidToken();
    await this.users.updateOne({ _id: userId }, { emailVerified: true }).exec();
  }

  /** Silent for unknown emails, so callers cannot tell whether an account exists. */
  async requestReset(email: string): Promise<void> {
    const user = await this.users.findOne({ email }).exec();
    if (!user) return;
    const token = await this.challenges.issue(user.id, 'password_reset');
    await this.mailer.send({
      to: user.email,
      subject: 'Reset your NARAD password',
      text:
        `Open this link to choose a new password (valid for 1 hour):\n` +
        `${this.webOrigin}/reset-password?token=${token}\n\n` +
        `If you did not ask for this, you can ignore this message. Your password has not changed.`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.challenges.consume(token, 'password_reset');
    if (!userId) throw invalidToken();
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
    await this.users.updateOne({ _id: userId }, { passwordHash }).exec();
    await this.sessions.revokeAllForUser(userId);
  }
}
