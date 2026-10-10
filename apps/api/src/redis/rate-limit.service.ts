import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';

export const REDIS = Symbol('REDIS');

export interface CounterStore {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(@Inject(REDIS) private readonly store: CounterStore) {}

  /** Counts one attempt for `key`. Throws 429 once `limit` is exceeded within the window. */
  async hit(key: string, limit: number, windowSeconds: number): Promise<void> {
    const redisKey = `rl:${key}`;
    let count: number;
    try {
      count = await this.store.incr(redisKey);
      if (count === 1) await this.store.expire(redisKey, windowSeconds);
    } catch (err) {
      this.logger.warn(
        `Rate limiter unavailable, failing open: ${String(err)}`,
      );
      return;
    }
    if (count > limit) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please try again later.',
        },
        429,
      );
    }
  }
}
