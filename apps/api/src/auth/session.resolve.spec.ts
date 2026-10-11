import type { Model } from 'mongoose';
import type { User } from '../users/user.schema';
import type { Session } from './session.schema';
import { SessionService } from './session.service';

describe('SessionService.resolve', () => {
  it('returns the public user plus emailVerified, and nothing secret', async () => {
    const sessions = {
      findOne: () => ({
        exec: () => Promise.resolve({ id: 's1', userId: 'u1' }),
      }),
    } as unknown as Model<Session>;
    const users = {
      findById: () => ({
        exec: () =>
          Promise.resolve({
            id: 'u1',
            handle: 'asha_k',
            displayName: 'Asha',
            createdAt: new Date('2026-01-01'),
            emailVerified: true,
            passwordHash: 'should-never-appear',
          }),
      }),
    } as unknown as Model<User>;

    const result = await new SessionService(sessions, users).resolve('token');

    expect(result?.user).toEqual({
      id: 'u1',
      handle: 'asha_k',
      displayName: 'Asha',
      createdAt: '2026-01-01T00:00:00.000Z',
      emailVerified: true,
    });
    expect(JSON.stringify(result)).not.toContain('should-never-appear');
  });
});
