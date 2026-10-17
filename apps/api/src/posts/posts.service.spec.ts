import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { type Model, Types } from 'mongoose';
import type { Block } from '../social/block.schema';
import type { Follow } from '../social/follow.schema';
import type { Mute } from '../social/mute.schema';
import type { User } from '../users/user.schema';
import type { Post } from './post.schema';
import { PostsService } from './posts.service';

interface Chain<T> {
  select: () => Chain<T>;
  limit: () => Chain<T>;
  sort: () => Chain<T>;
  exec: () => Promise<T>;
}
function chain<T>(value: T): Chain<T> {
  const c: Chain<T> = {
    select: () => c,
    limit: () => c,
    sort: () => c,
    exec: () => Promise.resolve(value),
  };
  return c;
}
const hit = (v: boolean | undefined) => ({
  exec: () => Promise.resolve(v ? { _id: 1 } : null),
});

const ME = new Types.ObjectId();
const AUTHOR = new Types.ObjectId();
const me = ME.toString();
const author = (isPrivate = false) => ({
  _id: AUTHOR,
  id: AUTHOR.toString(),
  handle: 'priya',
  displayName: 'Priya',
  isPrivate,
});
const POST_ID = new Types.ObjectId().toString();
const postDoc = {
  id: POST_ID,
  authorId: AUTHOR,
  text: 'hello',
  language: 'en' as const,
  createdAt: new Date('2026-01-01'),
  editedAt: null,
};

interface Opts {
  author?: ReturnType<typeof author> | null;
  post?: typeof postDoc | null;
  updated?: typeof postDoc | null;
  blockedByAuthor?: boolean;
  blockedByViewer?: boolean;
  following?: boolean;
  followed?: Types.ObjectId[];
  muted?: Types.ObjectId[];
  matched?: number;
}

function setup(o: Opts = {}) {
  const feedFilters: Array<Record<string, unknown>> = [];
  const created: Array<Record<string, unknown>> = [];
  const authorDoc = o.author === undefined ? author() : o.author;

  const posts = {
    create: (d: Record<string, unknown>) => {
      created.push(d);
      return Promise.resolve(postDoc);
    },
    findOne: () => chain(o.post === undefined ? postDoc : o.post),
    findOneAndUpdate: () => chain(o.updated === undefined ? null : o.updated),
    updateOne: () => chain({ matchedCount: o.matched ?? 0 }),
    find: (f: Record<string, unknown>) => {
      feedFilters.push(f);
      return chain([postDoc]);
    },
  } as unknown as Model<Post>;
  const users = {
    findById: () => chain(authorDoc),
    findOne: () => chain(authorDoc),
    find: () => chain(authorDoc ? [authorDoc] : []),
  } as unknown as Model<User>;
  const follows = {
    exists: () => hit(o.following),
    find: () => chain((o.followed ?? []).map((id) => ({ followeeId: id }))),
  } as unknown as Model<Follow>;
  const blocks = {
    exists: (f: { blockerId: Types.ObjectId }) =>
      hit(f.blockerId.equals(AUTHOR) ? o.blockedByAuthor : o.blockedByViewer),
  } as unknown as Model<Block>;
  const mutes = {
    find: () => chain((o.muted ?? []).map((id) => ({ mutedId: id }))),
  } as unknown as Model<Mute>;

  return {
    svc: new PostsService(posts, users, follows, blocks, mutes),
    feedFilters,
    created,
  };
}

describe('PostsService', () => {
  it('creates a post for the session user and returns no internal fields', async () => {
    const { svc, created } = setup({
      author: { ...author(), _id: ME, id: me },
    });
    const dto = await svc.create(me, { text: 'hello', language: 'en' });
    expect(created[0]?.authorId).toEqual(ME);
    expect(Object.keys(dto).sort()).toEqual(
      ['author', 'createdAt', 'editedAt', 'id', 'language', 'text'].sort(),
    );
  });

  it('404s a malformed post id', async () => {
    const { svc } = setup();
    await expect(svc.get('nope', me)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404s a deleted or missing post', async () => {
    const { svc } = setup({ post: null });
    await expect(svc.get(POST_ID, me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('shows a public post to a signed-out visitor', async () => {
    const { svc } = setup();
    await expect(svc.get(POST_ID, null)).resolves.toMatchObject({
      id: POST_ID,
    });
  });

  it('hides a post from someone the author has blocked', async () => {
    const { svc } = setup({ blockedByAuthor: true });
    await expect(svc.get(POST_ID, me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('hides a post from someone who blocked the author', async () => {
    const { svc } = setup({ blockedByViewer: true });
    await expect(svc.get(POST_ID, me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("hides a private account's post from non-followers but not from followers", async () => {
    const stranger = setup({ author: author(true), following: false });
    await expect(stranger.svc.get(POST_ID, me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(stranger.svc.get(POST_ID, null)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const follower = setup({ author: author(true), following: true });
    await expect(follower.svc.get(POST_ID, me)).resolves.toMatchObject({
      id: POST_ID,
    });
  });

  it('returns 403 for a private timeline and 404 for a blocked one', async () => {
    const priv = setup({ author: author(true), following: false });
    await expect(
      priv.svc.timeline('priya', me, null, 20),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const blocked = setup({ blockedByAuthor: true });
    await expect(
      blocked.svc.timeline('priya', me, null, 20),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('only lets the author edit or delete, and 404s otherwise', async () => {
    const { svc } = setup({ updated: null, matched: 0 });
    await expect(svc.edit(me, POST_ID, 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(svc.remove(me, POST_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('builds the home feed from you and followed users, minus muted ones', async () => {
    const kept = new Types.ObjectId();
    const mutedOne = new Types.ObjectId();
    const { svc, feedFilters } = setup({
      followed: [kept, mutedOne],
      muted: [mutedOne],
    });
    await svc.homeFeed(me, null, 20);
    const ids = (feedFilters[0]?.authorId as { $in: Types.ObjectId[] }).$in.map(
      String,
    );
    expect(ids).toContain(me);
    expect(ids).toContain(kept.toString());
    expect(ids).not.toContain(mutedOne.toString());
    expect(feedFilters[0]).toMatchObject({ deletedAt: null });
  });

  it('rejects a malformed cursor', async () => {
    const { svc } = setup();
    await expect(svc.homeFeed(me, 'not-an-id', 20)).rejects.toMatchObject({
      status: 400,
    });
  });
});
