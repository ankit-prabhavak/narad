import { HttpException, Logger } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';

function fakeStore() {
  const counts = new Map<string, number>();
  const expired: string[] = [];
  return {
    expired,
    store: {
      incr: (key: string) => {
        const n = (counts.get(key) ?? 0) + 1;
        counts.set(key, n);
        return Promise.resolve(n);
      },
      expire: (key: string) => {
        expired.push(key);
        return Promise.resolve(1);
      },
    },
  };
}

describe('RateLimitService', () => {
  it('allows up to the limit, then throws 429', async () => {
    const { store } = fakeStore();
    const limiter = new RateLimitService(store);
    await limiter.hit('k', 2, 60);
    await limiter.hit('k', 2, 60);
    const err: unknown = await limiter.hit('k', 2, 60).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
  });

  it('keeps separate counters per key', async () => {
    const { store } = fakeStore();
    const limiter = new RateLimitService(store);
    await limiter.hit('a', 1, 60);
    await expect(limiter.hit('b', 1, 60)).resolves.toBeUndefined();
  });

  it('sets the expiry only when a window starts', async () => {
    const { store, expired } = fakeStore();
    const limiter = new RateLimitService(store);
    await limiter.hit('k', 5, 60);
    await limiter.hit('k', 5, 60);
    expect(expired).toEqual(['rl:k']);
  });

  it('fails open when Redis is unavailable', async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const limiter = new RateLimitService({
      incr: () => Promise.reject(new Error('down')),
      expire: () => Promise.resolve(1),
    });
    await expect(limiter.hit('k', 1, 60)).resolves.toBeUndefined();
  });
});
