import { BadRequestException } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { MailMessage, Mailer } from '../mail/mailer';
import type { User } from '../users/user.schema';
import type { ChallengeService } from './challenge.service';
import { RecoveryService } from './recovery.service';
import type { SessionService } from './session.service';

function setup(
  opts: {
    consumeResult?: string | null;
    user?: Record<string, unknown> | null;
  } = {},
) {
  const updates: Array<Record<string, unknown>> = [];
  const mails: MailMessage[] = [];
  const revoked: string[] = [];
  const issued: string[] = [];

  const users = {
    findOne: () => ({ exec: () => Promise.resolve(opts.user ?? null) }),
    findById: () => ({ exec: () => Promise.resolve(opts.user ?? null) }),
    updateOne: (_filter: unknown, update: Record<string, unknown>) => {
      updates.push(update);
      return { exec: () => Promise.resolve({}) };
    },
  } as unknown as Model<User>;
  const challenges = {
    issue: (_userId: string, type: string) => {
      issued.push(type);
      return Promise.resolve('tok-123');
    },
    consume: () => Promise.resolve(opts.consumeResult ?? null),
  } as unknown as ChallengeService;
  const sessions = {
    revokeAllForUser: (id: string) => {
      revoked.push(id);
      return Promise.resolve();
    },
  } as unknown as SessionService;
  const mailer: Mailer = {
    send: (m) => {
      mails.push(m);
      return Promise.resolve();
    },
  };
  const svc = new RecoveryService(
    users,
    challenges,
    sessions,
    mailer,
    'http://web.test',
  );
  return { svc, updates, mails, revoked, issued };
}

describe('RecoveryService', () => {
  it('emails a verification link containing the token', async () => {
    const { svc, mails } = setup();
    await svc.sendVerification('u1', 'asha@example.com');
    expect(mails[0]?.to).toBe('asha@example.com');
    expect(mails[0]?.text).toContain(
      'http://web.test/verify-email?token=tok-123',
    );
  });

  it('does not resend verification to an already verified user', async () => {
    const { svc, mails } = setup({
      user: { emailVerified: true, email: 'a@example.com' },
    });
    await svc.resendVerification('u1');
    expect(mails).toHaveLength(0);
  });

  it('rejects an invalid verification token', async () => {
    const { svc, updates } = setup({ consumeResult: null });
    await expect(svc.verifyEmail('bad')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(updates).toHaveLength(0);
  });

  it('marks the email verified for a valid token', async () => {
    const { svc, updates } = setup({ consumeResult: 'u1' });
    await svc.verifyEmail('good');
    expect(updates[0]).toEqual({ emailVerified: true });
  });

  it('stays silent and sends nothing for an unknown email', async () => {
    const { svc, mails, issued } = setup({ user: null });
    await expect(
      svc.requestReset('nobody@example.com'),
    ).resolves.toBeUndefined();
    expect(mails).toHaveLength(0);
    expect(issued).toHaveLength(0);
  });

  it('emails a reset link to a known account', async () => {
    const { svc, mails } = setup({
      user: { id: 'u1', email: 'asha@example.com' },
    });
    await svc.requestReset('asha@example.com');
    expect(mails[0]?.to).toBe('asha@example.com');
    expect(mails[0]?.text).toContain(
      'http://web.test/reset-password?token=tok-123',
    );
  });

  it('resets the password with argon2id and revokes every session', async () => {
    const { svc, updates, revoked } = setup({ consumeResult: 'u1' });
    await svc.resetPassword('good', 'brand-new-password-1');
    expect(String(updates[0]?.passwordHash)).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(updates[0])).not.toContain('brand-new-password-1');
    expect(revoked).toEqual(['u1']);
  });

  it('changes nothing when the reset token is invalid', async () => {
    const { svc, updates, revoked } = setup({ consumeResult: null });
    await expect(
      svc.resetPassword('bad', 'brand-new-password-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updates).toHaveLength(0);
    expect(revoked).toHaveLength(0);
  });
});
