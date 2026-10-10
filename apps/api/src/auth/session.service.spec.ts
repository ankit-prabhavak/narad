import { createHash } from 'node:crypto';
import type { Model } from 'mongoose';
import type { User } from '../users/user.schema';
import type { Session } from './session.schema';
import { SessionService } from './session.service';

describe('SessionService', () => {
  it('stores only the hash of the token', async () => {
    let stored: Record<string, unknown> = {};
    const sessions = {
      create: (d: Record<string, unknown>) => {
        stored = d;
        return Promise.resolve(d);
      },
    } as unknown as Model<Session>;
    const svc = new SessionService(sessions, {} as unknown as Model<User>);

    const { token, expiresAt } = await svc.create(
      '507f1f77bcf86cd799439011',
      'jest',
    );

    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(stored.tokenHash).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 29 * 24 * 60 * 60 * 1000,
    );
  });

  it('returns null for an unknown, revoked or expired token', async () => {
    const sessions = {
      findOne: () => ({ exec: () => Promise.resolve(null) }),
    } as unknown as Model<Session>;
    const svc = new SessionService(sessions, {} as unknown as Model<User>);
    await expect(svc.resolve('whatever')).resolves.toBeNull();
  });
});
