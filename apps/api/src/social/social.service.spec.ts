import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { type Model, Types } from 'mongoose';
import type { User } from '../users/user.schema';
import type { Block } from './block.schema';
import type { FollowRequest } from './follow-request.schema';
import type { Follow } from './follow.schema';
import type { Mute } from './mute.schema';
import { SocialService } from './social.service';

const ME = new Types.ObjectId();
const THEM = new Types.ObjectId();
const me = ME.toString();

interface Opts {
  target?: Record<string, unknown> | null;
  upserted?: number;
  deleted?: number;
  following?: boolean;
  blockedByTarget?: boolean;
  viewerBlocked?: boolean;
  claimed?: boolean;
}

function setup(opts: Opts = {}) {
  const incs: unknown[] = [];
  const requestsCreated: unknown[] = [];
  const hit = (v: boolean | undefined) => ({
    exec: () => Promise.resolve(v ? { _id: 1 } : null),
  });
  const done = <T>(value: T) => ({ exec: () => Promise.resolve(value) });

  const users = {
    findOne: () => done(opts.target ?? null),
    updateOne: (_filter: unknown, update: { $inc: unknown }) => {
      incs.push(update.$inc);
      return done({});
    },
  } as unknown as Model<User>;
  const follows = {
    exists: () => hit(opts.following),
    updateOne: () => done({ upsertedCount: opts.upserted ?? 0 }),
    deleteOne: () => done({ deletedCount: opts.deleted ?? 0 }),
  } as unknown as Model<Follow>;
  const blocks = {
    exists: (f: { blockerId: Types.ObjectId }) =>
      hit(f.blockerId.equals(THEM) ? opts.blockedByTarget : opts.viewerBlocked),
    updateOne: () => done({}),
    deleteOne: () => done({}),
  } as unknown as Model<Block>;
  const mutes = {
    updateOne: () => done({}),
    deleteOne: () => done({}),
  } as unknown as Model<Mute>;
  const requests = {
    exists: () => hit(false),
    updateOne: (filter: unknown) => {
      requestsCreated.push(filter);
      return done({});
    },
    deleteOne: () => done({}),
    deleteMany: () => done({}),
    findOneAndDelete: () => done(opts.claimed ? { _id: 1 } : null),
  } as unknown as Model<FollowRequest>;

  return {
    svc: new SocialService(users, follows, blocks, mutes, requests),
    incs,
    requestsCreated,
  };
}

const pub = {
  id: THEM.toString(),
  _id: THEM,
  handle: 'priya',
  isPrivate: false,
};
const priv = { ...pub, isPrivate: true };

describe('SocialService follow', () => {
  it('404s for an unknown handle', async () => {
    const { svc } = setup({ target: null });
    await expect(svc.follow(me, 'nobody')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses to follow yourself', async () => {
    const { svc } = setup({ target: { ...pub, id: me, _id: ME } });
    await expect(svc.follow(me, 'me')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('follows a public account and increments both counters', async () => {
    const { svc, incs } = setup({ target: pub, upserted: 1 });
    await expect(svc.follow(me, 'priya')).resolves.toBe('following');
    expect(incs).toEqual([{ followersCount: 1 }, { followingCount: 1 }]);
  });

  it('does not double count a repeated follow', async () => {
    const { svc, incs } = setup({ target: pub, upserted: 0 });
    await svc.follow(me, 'priya');
    expect(incs).toHaveLength(0);
  });

  it('creates a request, not a follow, for a private account', async () => {
    const { svc, incs, requestsCreated } = setup({ target: priv, upserted: 1 });
    await expect(svc.follow(me, 'priya')).resolves.toBe('requested');
    expect(incs).toHaveLength(0);
    expect(requestsCreated).toHaveLength(1);
  });

  it('creates no request when already following a private account', async () => {
    const { svc, requestsCreated } = setup({ target: priv, following: true });
    await expect(svc.follow(me, 'priya')).resolves.toBe('following');
    expect(requestsCreated).toHaveLength(0);
  });

  it('hides the account from someone it has blocked', async () => {
    const { svc } = setup({ target: pub, blockedByTarget: true });
    await expect(svc.follow(me, 'priya')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('asks you to unblock before following', async () => {
    const { svc } = setup({ target: pub, viewerBlocked: true });
    await expect(svc.follow(me, 'priya')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('decrements counters only when an unfollow removes a row', async () => {
    const removed = setup({ target: pub, deleted: 1 });
    await removed.svc.unfollow(me, 'priya');
    expect(removed.incs).toEqual([
      { followersCount: -1 },
      { followingCount: -1 },
    ]);

    const none = setup({ target: pub, deleted: 0 });
    await none.svc.unfollow(me, 'priya');
    expect(none.incs).toHaveLength(0);
  });
});

describe('SocialService follow requests', () => {
  it('approves a pending request and creates the follow once', async () => {
    const { svc, incs } = setup({ target: pub, claimed: true, upserted: 1 });
    await svc.approve(me, 'priya');
    expect(incs).toEqual([{ followersCount: 1 }, { followingCount: 1 }]);
  });

  it('404s when there is no pending request, and changes nothing', async () => {
    const { svc, incs } = setup({ target: pub, claimed: false });
    await expect(svc.approve(me, 'priya')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(incs).toHaveLength(0);
  });
});

describe('SocialService block', () => {
  it('removes follows in both directions', async () => {
    const { svc, incs } = setup({ target: pub, deleted: 1 });
    await svc.block(me, 'priya');
    expect(incs).toHaveLength(4);
  });

  it('refuses to block yourself', async () => {
    const { svc } = setup({ target: { ...pub, id: me, _id: ME } });
    await expect(svc.block(me, 'me')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('SocialService visibility', () => {
  it('404s the profile for someone the account has blocked', async () => {
    const { svc } = setup({ target: pub, blockedByTarget: true });
    await expect(svc.getProfile('priya', me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("keeps a private account's lists from strangers and signed-out visitors", async () => {
    const { svc } = setup({ target: priv, following: false });
    await expect(
      svc.listFollowers('priya', null, null, 20),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      svc.listFollowing('priya', me, null, 20),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a malformed cursor', async () => {
    const { svc } = setup({ target: pub });
    await expect(
      svc.listFollowers('priya', null, 'not-an-id', 20),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
