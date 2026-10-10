import { createHash } from 'node:crypto';
import type { Model } from 'mongoose';
import type { Challenge } from './challenge.schema';
import { ChallengeService } from './challenge.service';

const USER = '507f1f77bcf86cd799439011';

function setup(found: unknown) {
  const created: Array<Record<string, unknown>> = [];
  const invalidated: unknown[] = [];
  const queries: Array<Record<string, unknown>> = [];
  const model = {
    updateMany: (filter: unknown) => {
      invalidated.push(filter);
      return { exec: () => Promise.resolve({}) };
    },
    create: (d: Record<string, unknown>) => {
      created.push(d);
      return Promise.resolve(d);
    },
    findOneAndUpdate: (filter: Record<string, unknown>) => {
      queries.push(filter);
      return { exec: () => Promise.resolve(found) };
    },
  } as unknown as Model<Challenge>;
  return { svc: new ChallengeService(model), created, invalidated, queries };
}

describe('ChallengeService', () => {
  it('stores only the hash of the token and invalidates earlier tokens', async () => {
    const { svc, created, invalidated } = setup(null);
    const token = await svc.issue(USER, 'password_reset');

    expect(invalidated).toHaveLength(1);
    expect(created[0]?.tokenHash).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(JSON.stringify(created[0])).not.toContain(token);
  });

  it('gives reset tokens about one hour and verification tokens about a day', async () => {
    const reset = setup(null);
    await reset.svc.issue(USER, 'password_reset');
    const resetMs =
      (reset.created[0]?.expiresAt as Date).getTime() - Date.now();
    expect(resetMs).toBeLessThanOrEqual(60 * 60 * 1000);
    expect(resetMs).toBeGreaterThan(59 * 60 * 1000);

    const verify = setup(null);
    await verify.svc.issue(USER, 'email_verify');
    const verifyMs =
      (verify.created[0]?.expiresAt as Date).getTime() - Date.now();
    expect(verifyMs).toBeGreaterThan(23 * 60 * 60 * 1000);
  });

  it('claims only unused, unexpired tokens of the right type', async () => {
    const { svc, queries } = setup({ userId: { toString: () => 'u1' } });
    await expect(svc.consume('some-token', 'password_reset')).resolves.toBe(
      'u1',
    );
    expect(queries[0]).toMatchObject({
      type: 'password_reset',
      usedAt: null,
      tokenHash: createHash('sha256').update('some-token').digest('hex'),
    });
  });

  it('returns null when nothing matches', async () => {
    const { svc } = setup(null);
    await expect(svc.consume('nope', 'email_verify')).resolves.toBeNull();
  });
});
