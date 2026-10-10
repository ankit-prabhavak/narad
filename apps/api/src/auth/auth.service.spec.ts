import { ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Model } from 'mongoose';
import type { User } from '../users/user.schema';
import { AuthService } from './auth.service';

const input = {
  email: 'asha@example.com',
  handle: 'asha_k',
  displayName: 'Asha',
  password: 'correct-horse-battery',
};

describe('AuthService.register', () => {
  it('stores an argon2id hash, never the password, and returns no hash', async () => {
    let stored: Record<string, unknown> = {};
    const model = {
      create: (doc: Record<string, unknown>) => {
        stored = doc;
        return Promise.resolve({
          ...doc,
          id: 'abc123',
          createdAt: new Date('2026-01-01'),
        });
      },
    } as unknown as Model<User>;

    const result = await new AuthService(model).register(input);

    expect(String(stored.passwordHash)).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toBe(input.password);
    await expect(
      argon2.verify(String(stored.passwordHash), input.password),
    ).resolves.toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/passwordHash|argon2/);
    expect(result).toEqual({
      id: 'abc123',
      handle: 'asha_k',
      displayName: 'Asha',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('maps a duplicate-key error to a generic 409', async () => {
    const model = {
      create: () =>
        Promise.reject(Object.assign(new Error('dup'), { code: 11000 })),
    } as unknown as Model<User>;
    await expect(new AuthService(model).register(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
