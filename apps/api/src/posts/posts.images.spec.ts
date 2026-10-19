import { type Model, Types } from 'mongoose';
import type { MediaAssetService } from '../media/media-asset.service';
import type { Block } from '../social/block.schema';
import type { Follow } from '../social/follow.schema';
import type { Mute } from '../social/mute.schema';
import type { User } from '../users/user.schema';
import type { Interaction } from './interaction.schema';
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

const AUTHOR = new Types.ObjectId();
const me = AUTHOR.toString();
const author = {
  _id: AUTHOR,
  id: me,
  handle: 'asha',
  displayName: 'Asha',
  isPrivate: false,
  avatarKey: null,
};
const PARENT_ID = new Types.ObjectId();
const parentDoc = {
  _id: PARENT_ID,
  id: PARENT_ID.toString(),
  authorId: AUTHOR,
  parentId: null as Types.ObjectId | null,
  text: 'parent',
  language: 'en' as const,
  images: [] as Array<{ key: string; width: number; height: number }>,
  likeCount: 0,
  replyCount: 0,
  createdAt: new Date('2026-01-01'),
  editedAt: null,
};
const IMAGES = [{ key: 'posts/u/a.webp', width: 800, height: 600 }];

interface Opts {
  claimError?: Error;
  createError?: Error;
  removed?: typeof parentDoc | null;
}

function setup(o: Opts = {}) {
  const created: Array<Record<string, unknown>> = [];
  const claims: Array<{
    userId: string;
    ids: string[];
    postId: Types.ObjectId;
  }> = [];
  const released: Types.ObjectId[] = [];
  const purged: Types.ObjectId[] = [];

  const media = {
    claim: (userId: string, ids: string[], postId: Types.ObjectId) => {
      claims.push({ userId, ids, postId });
      return o.claimError
        ? Promise.reject(o.claimError)
        : Promise.resolve(ids.length ? IMAGES : []);
    },
    release: (postId: Types.ObjectId) => {
      released.push(postId);
      return Promise.resolve();
    },
    deleteForPost: (postId: Types.ObjectId) => {
      purged.push(postId);
      return Promise.resolve();
    },
  } as unknown as MediaAssetService;

  const posts = {
    create: (d: Record<string, unknown>) => {
      if (o.createError) return Promise.reject(o.createError);
      created.push(d);
      return Promise.resolve({
        ...parentDoc,
        ...d,
        id: String(d._id),
        createdAt: new Date('2026-01-02'),
      });
    },
    findOne: () => chain(parentDoc),
    findOneAndUpdate: () => chain(o.removed ?? null),
    updateOne: () => chain({}),
  } as unknown as Model<Post>;
  const users = {
    findById: () => chain(author),
    find: () => chain([author]),
  } as unknown as Model<User>;
  const none = { exists: () => ({ exec: () => Promise.resolve(null) }) };
  const follows = none as unknown as Model<Follow>;
  const blocks = none as unknown as Model<Block>;
  const mutes = none as unknown as Model<Mute>;
  const interactions = {
    find: () => chain([]),
  } as unknown as Model<Interaction>;

  return {
    svc: new PostsService(
      posts,
      users,
      follows,
      blocks,
      mutes,
      interactions,
      media,
    ),
    created,
    claims,
    released,
    purged,
  };
}

describe('PostsService with images', () => {
  it('claims the images for the new post id and embeds them', async () => {
    const { svc, created, claims } = setup();
    const dto = await svc.create(me, {
      text: 'hi',
      language: 'en',
      imageIds: ['a'.repeat(24)],
    });
    expect(claims[0]?.userId).toBe(me);
    expect(claims[0]?.ids).toEqual(['a'.repeat(24)]);
    expect(created[0]?._id).toEqual(claims[0]?.postId);
    expect(created[0]?.images).toEqual(IMAGES);
    expect(dto.images).toEqual([
      { url: '/api/v1/media/posts/u/a.webp', width: 800, height: 600 },
    ]);
  });

  it('creates a post without images when none are sent', async () => {
    const { svc, claims } = setup();
    const dto = await svc.create(me, { text: 'hi', language: 'en' });
    expect(claims[0]?.ids).toEqual([]);
    expect(dto.images).toEqual([]);
  });

  it('creates nothing when the images cannot be claimed', async () => {
    const { svc, created } = setup({ claimError: new Error('invalid media') });
    await expect(
      svc.create(me, {
        text: 'hi',
        language: 'en',
        imageIds: ['a'.repeat(24)],
      }),
    ).rejects.toThrow('invalid media');
    expect(created).toHaveLength(0);
  });

  it('releases the images again when saving the post fails', async () => {
    const { svc, claims, released } = setup({
      createError: new Error('db down'),
    });
    await expect(
      svc.create(me, {
        text: 'hi',
        language: 'en',
        imageIds: ['a'.repeat(24)],
      }),
    ).rejects.toThrow('db down');
    expect(released).toEqual([claims[0]?.postId]);
  });

  it('attaches images to a comment and links it to its parent', async () => {
    const { svc, created, claims } = setup();
    const dto = await svc.reply(me, PARENT_ID.toString(), {
      text: '',
      language: 'en',
      imageIds: ['b'.repeat(24)],
    });
    expect(created[0]?.parentId).toEqual(PARENT_ID);
    expect(claims[0]?.postId).toEqual(created[0]?._id);
    expect(dto.images).toHaveLength(1);
  });

  it("deletes a post's image files when the post is deleted", async () => {
    const { svc, purged } = setup({ removed: parentDoc });
    await svc.remove(me, PARENT_ID.toString());
    expect(purged).toEqual([PARENT_ID]);
  });
});
