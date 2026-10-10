import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Model } from 'mongoose';
import type { User } from '../users/user.schema';
import { AuthService } from './auth.service';

const modelReturning = (doc: unknown) =>
  ({
    findOne: () => ({ select: () => ({ exec: () => Promise.resolve(doc) }) }),
  }) as unknown as Model<User>;

describe('AuthService.login', () => {
  let userDoc: Record<string, unknown>;

  beforeAll(async () => {
    userDoc = {
      id: 'u1',
      handle: 'asha_k',
      displayName: 'Asha',
      createdAt: new Date('2026-01-01'),
      passwordHash: await argon2.hash('correct-horse-battery', {
        type: argon2.argon2id,
      }),
    };
  });

  it('returns the public user for the right password, without any hash', async () => {
    const user = await new AuthService(modelReturning(userDoc)).login({
      email: 'asha@example.com',
      password: 'correct-horse-battery',
    });
    expect(user).toEqual({
      id: 'u1',
      handle: 'asha_k',
      displayName: 'Asha',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(JSON.stringify(user)).not.toMatch(/passwordHash|argon2/);
  });

  it('rejects a wrong password and an unknown email with the same error', async () => {
    const wrong = new AuthService(modelReturning(userDoc)).login({
      email: 'asha@example.com',
      password: 'wrong-password-123',
    });
    const unknown = new AuthService(modelReturning(null)).login({
      email: 'nobody@example.com',
      password: 'wrong-password-123',
    });
    await expect(wrong).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(unknown).rejects.toBeInstanceOf(UnauthorizedException);

    const a = await wrong.catch((e: UnauthorizedException) => e.getResponse());
    const b = await unknown.catch((e: UnauthorizedException) =>
      e.getResponse(),
    );
    expect(a).toEqual(b);
  });
});
