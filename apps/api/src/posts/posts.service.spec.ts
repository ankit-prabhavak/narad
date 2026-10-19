import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { type Model, Types } from 'mongoose';
import type { Block } from '../social/block.schema';
import type { Follow } from '../social/follow.schema';
import type { Mute } from '../social/mute.schema';
import type { User } from '../users/user.schema';
import type { Interaction } from './interaction.schema';
import type { Post } from './post.schema';
import { PostsService } from './posts.service';
import type { MediaAssetService } from '../media/media-asset.service';

const noMedia = {
  claim: () => Promise.resolve([]),
  release: () => Promise.resolve(),
  deleteForPost: () => Promise.resolve(),
} as unknown as MediaAssetService;

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
const PARENT = new Types.ObjectId();
const me = ME.toString();
const author = (isPrivate = false) => ({
  _id: AUTHOR,
  id: AUTHOR.toString(),
  handle: 'priya',
  displayName: 'Priya',
  isPrivate,
});
const POST_OID = new Types.ObjectId();
const POST_ID = POST_OID.toString();
const postDoc = {
  _id: POST_OID,
  id: POST_ID,
  authorId: AUTHOR,
  parentId: null as Types.ObjectId | null,
  text: 'hello',
  language: 'en' as const,
  likeCount: 0,
  replyCount: 0,
  images: [] as Array<{ key: string; width: number; height: number }>,
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
  upserted?: number;
  deleted?: number;
  interactionRows?: unknown[];
}

function setup(o: Opts = {}) {
  const feedFilters: Array<Record<string, unknown>> = [];
  const created: Array<Record<string, unknown>> = [];
  const postUpdates: Array<{ filter: unknown; update: unknown }> = [];
  const authorDoc = o.author === undefined ? author() : o.author;

  const posts = {
    create: (d: Record<string, unknown>) => {
      created.push(d);
      return Promise.resolve({
        ...postDoc,
        parentId: (d.parentId as Types.ObjectId | undefined) ?? null,
      });
    },
    findOne: () => chain(o.post === undefined ? postDoc : o.post),
    findOneAndUpdate: () => chain(o.updated === undefined ? null : o.updated),
    updateOne: (filter: unknown, update: unknown) => {
      postUpdates.push({ filter, update });
      return chain({});
    },
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
  const interactions = {
    updateOne: () => chain({ upsertedCount: o.upserted ?? 0 }),
    deleteOne: () => chain({ deletedCount: o.deleted ?? 0 }),
    find: () => chain(o.interactionRows ?? []),
  } as unknown as Model<Interaction>;

  return {
    svc: new PostsService(
      posts,
      users,
      follows,
      blocks,
      mutes,
      interactions,
      noMedia,
    ),
    feedFilters,
    created,
    postUpdates,
  };
}

const incs = (updates: Array<{ update: unknown }>) =>
  updates.map((u) => (u.update as { $inc: unknown }).$inc);

describe('PostsService basics', () => {
  it('creates a post for the session user and returns the expected fields only', async () => {
    const { svc, created } = setup();
    const dto = await svc.create(AUTHOR.toString(), {
      text: 'hello',
      language: 'en',
    });
    expect(created[0]?.authorId).toEqual(AUTHOR);
    expect(Object.keys(dto).sort()).toEqual(
      [
        'author',
        'createdAt',
        'editedAt',
        'id',
        'language',
        'likeCount',
        'parentId',
        'replyCount',
        'text',
        'viewer',
        'images',
      ].sort(),
    );
  });

  it('404s a malformed post id, and a deleted or missing post', async () => {
    await expect(setup().svc.get('nope', me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      setup({ post: null }).svc.get(POST_ID, me),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('shows a public post to a signed-out visitor, with no viewer state', async () => {
    const dto = await setup().svc.get(POST_ID, null);
    expect(dto.viewer).toBeNull();
  });

  it("reports the signed-in viewer's like and bookmark state", async () => {
    const { svc } = setup({
      interactionRows: [
        { postId: POST_OID, type: 'like' },
        { postId: POST_OID, type: 'bookmark' },
      ],
    });
    const dto = await svc.get(POST_ID, me);
    expect(dto.viewer).toEqual({ liked: true, bookmarked: true });
  });

  it('hides a post from blocked users in either direction', async () => {
    await expect(
      setup({ blockedByAuthor: true }).svc.get(POST_ID, me),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      setup({ blockedByViewer: true }).svc.get(POST_ID, me),
    ).rejects.toBeInstanceOf(NotFoundException);
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
    const { svc } = setup({ updated: null });
    await expect(svc.edit(me, POST_ID, 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(svc.remove(me, POST_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('PostsService feeds', () => {
  it('builds the home feed from you and followed users, minus muted, without comments', async () => {
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
    expect(feedFilters[0]).toMatchObject({ deletedAt: null, parentId: null });
  });

  it('keeps comments out of a profile timeline', async () => {
    const { svc, feedFilters } = setup();
    await svc.timeline('priya', null, null, 20);
    expect(feedFilters[0]).toMatchObject({ parentId: null, deletedAt: null });
  });

  it('rejects a malformed cursor', async () => {
    await expect(
      setup().svc.homeFeed(me, 'not-an-id', 20),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('PostsService likes and bookmarks', () => {
  it('increments the like count only when a like is really created', async () => {
    const first = setup({ upserted: 1 });
    await first.svc.setLike(me, POST_ID, true);
    expect(incs(first.postUpdates)).toEqual([{ likeCount: 1 }]);

    const repeat = setup({ upserted: 0 });
    await repeat.svc.setLike(me, POST_ID, true);
    expect(repeat.postUpdates).toHaveLength(0);
  });

  it('decrements only when a like is really removed', async () => {
    const removed = setup({ deleted: 1 });
    await removed.svc.setLike(me, POST_ID, false);
    expect(incs(removed.postUpdates)).toEqual([{ likeCount: -1 }]);

    const none = setup({ deleted: 0 });
    await none.svc.setLike(me, POST_ID, false);
    expect(none.postUpdates).toHaveLength(0);
  });

  it('never touches counters for bookmarks', async () => {
    const { svc, postUpdates } = setup({ upserted: 1 });
    await svc.setBookmark(me, POST_ID, true);
    expect(postUpdates).toHaveLength(0);
  });

  it('refuses to like or bookmark a post the viewer cannot see', async () => {
    const blocked = setup({ blockedByAuthor: true, upserted: 1 });
    await expect(blocked.svc.setLike(me, POST_ID, true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      blocked.svc.setBookmark(me, POST_ID, true),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(blocked.postUpdates).toHaveLength(0);
  });
});

describe('PostsService comments', () => {
  it('creates a comment linked to its parent and counts it', async () => {
    const { svc, created, postUpdates } = setup();
    const dto = await svc.reply(me, POST_ID, { text: 'nice', language: 'en' });
    expect(created[0]?.parentId).toEqual(POST_OID);
    expect(created[0]?.authorId).toEqual(ME);
    expect(incs(postUpdates)).toEqual([{ replyCount: 1 }]);
    expect(dto.parentId).toBe(POST_ID);
  });

  it('refuses to comment on a post the viewer cannot see', async () => {
    const blocked = setup({ blockedByAuthor: true });
    await expect(
      blocked.svc.reply(me, POST_ID, { text: 'x', language: 'en' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(blocked.created).toHaveLength(0);
  });

  it("lowers the parent's comment count when a comment is deleted", async () => {
    const { svc, postUpdates } = setup({
      updated: { ...postDoc, parentId: PARENT },
    });
    await svc.remove(me, POST_ID);
    expect(incs(postUpdates)).toEqual([{ replyCount: -1 }]);
    expect(postUpdates[0]?.filter).toEqual({ _id: PARENT });
  });

  it('does not touch any count when a normal post is deleted', async () => {
    const { svc, postUpdates } = setup({ updated: postDoc });
    await svc.remove(me, POST_ID);
    expect(postUpdates).toHaveLength(0);
  });

  it('lists comments oldest first and only for visible parents', async () => {
    const ok = setup();
    await ok.svc.replies(POST_ID, me, null, 20);
    expect(ok.feedFilters[0]).toMatchObject({
      parentId: POST_OID,
      deletedAt: null,
    });

    const hidden = setup({ blockedByAuthor: true });
    await expect(
      hidden.svc.replies(POST_ID, me, null, 20),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
