import { BadRequestException, NotFoundException } from '@nestjs/common';
import { type Model, Types } from 'mongoose';
import type { User } from '../users/user.schema';
import type { Follow } from './follow.schema';
import { SocialService } from './social.service';

const ME = new Types.ObjectId().toString();
const THEM = new Types.ObjectId();

function setup(
  opts: {
    target?: Record<string, unknown> | null;
    upserted?: number;
    deleted?: number;
  } = {},
) {
  const incs: Array<{ id: string; inc: unknown }> = [];
  const users = {
    findOne: () => ({
      exec: () =>
        Promise.resolve(opts.target === undefined ? null : opts.target),
    }),
    updateOne: (filter: { _id: Types.ObjectId }, update: { $inc: unknown }) => {
      incs.push({ id: filter._id.toString(), inc: update.$inc });
      return { exec: () => Promise.resolve({}) };
    },
  } as unknown as Model<User>;
  const follows = {
    updateOne: () => ({
      exec: () => Promise.resolve({ upsertedCount: opts.upserted ?? 0 }),
    }),
    deleteOne: () => ({
      exec: () => Promise.resolve({ deletedCount: opts.deleted ?? 0 }),
    }),
  } as unknown as Model<Follow>;
  return { svc: new SocialService(users, follows), incs };
}

const target = { id: THEM.toString(), _id: THEM, handle: 'priya' };

describe('SocialService follow/unfollow', () => {
  it('404s for an unknown handle', async () => {
    const { svc } = setup({ target: null });
    await expect(svc.follow(ME, 'nobody')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses to follow yourself', async () => {
    const { svc } = setup({
      target: { ...target, id: ME, _id: new Types.ObjectId(ME) },
    });
    await expect(svc.follow(ME, 'me')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('increments both counters only when a follow is created', async () => {
    const { svc, incs } = setup({ target, upserted: 1 });
    await svc.follow(ME, 'priya');
    expect(incs).toHaveLength(2);
    expect(incs.map((i) => i.inc)).toEqual([
      { followersCount: 1 },
      { followingCount: 1 },
    ]);
  });

  it('is a no-op when already following', async () => {
    const { svc, incs } = setup({ target, upserted: 0 });
    await svc.follow(ME, 'priya');
    expect(incs).toHaveLength(0);
  });

  it('decrements counters only when a follow is removed', async () => {
    const removed = setup({ target, deleted: 1 });
    await removed.svc.unfollow(ME, 'priya');
    expect(removed.incs.map((i) => i.inc)).toEqual([
      { followersCount: -1 },
      { followingCount: -1 },
    ]);

    const none = setup({ target, deleted: 0 });
    await none.svc.unfollow(ME, 'priya');
    expect(none.incs).toHaveLength(0);
  });

  it('rejects a malformed cursor', async () => {
    const { svc } = setup({ target });
    await expect(
      svc.listFollowers('priya', 'not-an-id', 20),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
