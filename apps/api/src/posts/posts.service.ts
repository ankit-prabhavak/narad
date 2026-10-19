import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type { CreatePostRequest, PostDto, PostPage } from '@narad/contracts';
import { Block } from '../social/block.schema';
import { Follow } from '../social/follow.schema';
import { Mute } from '../social/mute.schema';
import { User } from '../users/user.schema';
import { avatarUrl } from '../media/avatar-url';
import { Interaction } from './interaction.schema';
import { Post } from './post.schema';

const MAX_PAGE = 50;
const MAX_FOLLOWS_IN_FEED = 1000;
const oid = (id: string) => new Types.ObjectId(id);

const postNotFound = () =>
  new NotFoundException({ code: 'POST_NOT_FOUND', message: 'No such post.' });
const userNotFound = () =>
  new NotFoundException({ code: 'USER_NOT_FOUND', message: 'No such user.' });

interface AuthorLike {
  _id: Types.ObjectId;
  id: string;
  handle: string;
  displayName: string;
  isPrivate: boolean;
}

interface PostLike {
  _id: Types.ObjectId;
  id: string;
  authorId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  text: string;
  language: 'en' | 'hi';
  likeCount: number;
  replyCount: number;
  createdAt: Date;
  editedAt: Date | null;
}

type Visibility = 'ok' | 'blocked' | 'private';
type ViewerState = { liked: boolean; bookmarked: boolean };

interface PageOptions {
  asc?: boolean;
  checkVisibility?: boolean;
}

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly posts: Model<Post>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Follow.name) private readonly follows: Model<Follow>,
    @InjectModel(Block.name) private readonly blocks: Model<Block>,
    @InjectModel(Mute.name) private readonly mutes: Model<Mute>,
    @InjectModel(Interaction.name)
    private readonly interactions: Model<Interaction>,
  ) {}

  // ---- visibility and hydration -----------------------------------------

  private async visibility(
    author: AuthorLike,
    viewerId: string | null,
  ): Promise<Visibility> {
    if (viewerId === author.id) return 'ok';
    if (viewerId) {
      const me = oid(viewerId);
      const [blockedByAuthor, blockedByViewer] = await Promise.all([
        this.blocks.exists({ blockerId: author._id, blockedId: me }).exec(),
        this.blocks.exists({ blockerId: me, blockedId: author._id }).exec(),
      ]);
      if (blockedByAuthor !== null || blockedByViewer !== null)
        return 'blocked';
    }
    if (!author.isPrivate) return 'ok';
    if (!viewerId) return 'private';
    const follows = await this.follows
      .exists({ followerId: oid(viewerId), followeeId: author._id })
      .exec();
    return follows !== null ? 'ok' : 'private';
  }

  private async loadVisible(id: string, viewerId: string | null) {
    if (!Types.ObjectId.isValid(id)) throw postNotFound();
    const post = await this.posts
      .findOne({ _id: oid(id), deletedAt: null })
      .exec();
    if (!post) throw postNotFound();
    const author = await this.users.findById(post.authorId).exec();
    if (!author) throw postNotFound();
    if ((await this.visibility(author, viewerId)) !== 'ok')
      throw postNotFound();
    return { post, author };
  }

  private async viewerStates(
    postIds: Types.ObjectId[],
    viewerId: string | null,
  ) {
    const map = new Map<string, ViewerState>();
    if (!viewerId || postIds.length === 0) return map;
    const rows = await this.interactions
      .find({
        userId: oid(viewerId),
        postId: { $in: postIds },
        type: { $in: ['like', 'bookmark'] },
      })
      .exec();
    for (const r of rows) {
      const key = r.postId.toString();
      const state = map.get(key) ?? { liked: false, bookmarked: false };
      if (r.type === 'like') state.liked = true;
      else state.bookmarked = true;
      map.set(key, state);
    }
    return map;
  }

  private async hydrate(
    rows: PostLike[],
    viewerId: string | null,
    checkVisibility: boolean,
  ): Promise<PostDto[]> {
    if (rows.length === 0) return [];
    const authorIds = [...new Set(rows.map((r) => r.authorId.toString()))].map(
      oid,
    );
    const authors = await this.users.find({ _id: { $in: authorIds } }).exec();
    const byId = new Map(authors.map((a) => [a.id, a]));

    let allowed: Set<string> | null = null;
    if (checkVisibility) {
      const checks = await Promise.all(
        authors.map(
          async (a) =>
            [a.id, (await this.visibility(a, viewerId)) === 'ok'] as const,
        ),
      );
      allowed = new Set(checks.filter(([, ok]) => ok).map(([id]) => id));
    }

    const states = await this.viewerStates(
      rows.map((r) => r._id),
      viewerId,
    );
    const items: PostDto[] = [];
    for (const r of rows) {
      const a = byId.get(r.authorId.toString());
      if (!a) continue;
      if (allowed && !allowed.has(a.id)) continue;
      items.push({
        id: r.id,
        text: r.text,
        language: r.language,
        createdAt: r.createdAt.toISOString(),
        editedAt: r.editedAt ? r.editedAt.toISOString() : null,
        parentId: r.parentId ? r.parentId.toString() : null,
        likeCount: r.likeCount,
        replyCount: r.replyCount,
        author: {
          id: a.id,
          handle: a.handle,
          displayName: a.displayName,
          avatarUrl: avatarUrl(a.avatarKey),
        },
        viewer: viewerId
          ? (states.get(r.id) ?? { liked: false, bookmarked: false })
          : null,
      });
    }
    return items;
  }

  private async one(post: PostLike, viewerId: string | null): Promise<PostDto> {
    const [dto] = await this.hydrate([post], viewerId, false);
    if (!dto) throw postNotFound();
    return dto;
  }

  private cursorId(cursor: string | null): Types.ObjectId | null {
    if (cursor === null) return null;
    if (!Types.ObjectId.isValid(cursor)) {
      throw new BadRequestException({
        code: 'BAD_CURSOR',
        message: 'Invalid cursor.',
      });
    }
    return oid(cursor);
  }

  private clamp(limit: number): number {
    return Math.min(Math.max(Math.trunc(limit) || 20, 1), MAX_PAGE);
  }

  // ---- create, read, edit, delete ---------------------------------------

  async create(authorId: string, input: CreatePostRequest): Promise<PostDto> {
    const author = await this.users.findById(authorId).exec();
    if (!author) throw userNotFound();
    const post = await this.posts.create({
      authorId: oid(authorId),
      text: input.text,
      language: input.language,
    });
    return this.one(post, authorId);
  }

  async reply(
    authorId: string,
    parentId: string,
    input: CreatePostRequest,
  ): Promise<PostDto> {
    const { post: parent } = await this.loadVisible(parentId, authorId);
    const post = await this.posts.create({
      authorId: oid(authorId),
      parentId: parent._id,
      text: input.text,
      language: input.language,
    });
    await this.posts
      .updateOne({ _id: parent._id }, { $inc: { replyCount: 1 } })
      .exec();
    return this.one(post, authorId);
  }

  async get(id: string, viewerId: string | null): Promise<PostDto> {
    const { post } = await this.loadVisible(id, viewerId);
    return this.one(post, viewerId);
  }

  async edit(userId: string, id: string, text: string): Promise<PostDto> {
    if (!Types.ObjectId.isValid(id)) throw postNotFound();
    const post = await this.posts
      .findOneAndUpdate(
        { _id: oid(id), authorId: oid(userId), deletedAt: null },
        { $set: { text, editedAt: new Date() } },
        { new: true },
      )
      .exec();
    if (!post) throw postNotFound();
    return this.one(post, userId);
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw postNotFound();
    const post = await this.posts
      .findOneAndUpdate(
        { _id: oid(id), authorId: oid(userId), deletedAt: null },
        { deletedAt: new Date() },
      )
      .exec();
    if (!post) throw postNotFound();
    if (post.parentId) {
      await this.posts
        .updateOne({ _id: post.parentId }, { $inc: { replyCount: -1 } })
        .exec();
    }
  }

  // ---- likes and bookmarks ----------------------------------------------

  private async setInteraction(
    userId: string,
    id: string,
    type: 'like' | 'bookmark',
    on: boolean,
  ): Promise<void> {
    const { post } = await this.loadVisible(id, userId);
    const filter = { userId: oid(userId), postId: post._id, type };
    if (on) {
      const r = await this.interactions
        .updateOne(
          filter,
          { $setOnInsert: { ...filter, createdAt: new Date() } },
          { upsert: true },
        )
        .exec();
      if (r.upsertedCount === 1 && type === 'like') {
        await this.posts
          .updateOne({ _id: post._id }, { $inc: { likeCount: 1 } })
          .exec();
      }
    } else {
      const r = await this.interactions.deleteOne(filter).exec();
      if (r.deletedCount === 1 && type === 'like') {
        await this.posts
          .updateOne({ _id: post._id }, { $inc: { likeCount: -1 } })
          .exec();
      }
    }
  }

  setLike(userId: string, id: string, on: boolean) {
    return this.setInteraction(userId, id, 'like', on);
  }

  setBookmark(userId: string, id: string, on: boolean) {
    return this.setInteraction(userId, id, 'bookmark', on);
  }

  async bookmarks(
    viewerId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PostPage> {
    const size = this.clamp(limit);
    const after = this.cursorId(cursor);
    const filter = { userId: oid(viewerId), type: 'bookmark' as const };
    const rows = await this.interactions
      .find(after ? { ...filter, _id: { $lt: after } } : filter)
      .sort({ _id: -1 })
      .limit(size + 1)
      .exec();
    const hasMore = rows.length > size;
    const slice = rows.slice(0, size);
    const posts = await this.posts
      .find({ _id: { $in: slice.map((r) => r.postId) }, deletedAt: null })
      .exec();
    const byId = new Map(posts.map((p) => [p.id, p]));
    const ordered = slice.flatMap((r) => {
      const p = byId.get(r.postId.toString());
      return p ? [p] : [];
    });
    const items = await this.hydrate(ordered, viewerId, true);
    const last = slice[slice.length - 1];
    return { items, nextCursor: hasMore && last ? last.id : null };
  }

  // ---- lists --------------------------------------------------------------

  async timeline(
    handle: string,
    viewerId: string | null,
    cursor: string | null,
    limit: number,
  ): Promise<PostPage> {
    const author = await this.users
      .findOne({ handle: handle.toLowerCase() })
      .exec();
    if (!author) throw userNotFound();
    const visible = await this.visibility(author, viewerId);
    if (visible === 'blocked') throw userNotFound();
    if (visible === 'private') {
      throw new ForbiddenException({
        code: 'PRIVATE_ACCOUNT',
        message: 'This account is private.',
      });
    }
    return this.page(
      { authorId: author._id, parentId: null, deletedAt: null },
      viewerId,
      cursor,
      limit,
    );
  }

  async homeFeed(
    viewerId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PostPage> {
    const me = oid(viewerId);
    const [followed, muted] = await Promise.all([
      this.follows.find({ followerId: me }).limit(MAX_FOLLOWS_IN_FEED).exec(),
      this.mutes.find({ muterId: me }).exec(),
    ]);
    const mutedIds = new Set(muted.map((m) => m.mutedId.toString()));
    const authorIds = [
      me,
      ...followed
        .map((f) => f.followeeId)
        .filter((id) => !mutedIds.has(id.toString())),
    ];
    return this.page(
      { authorId: { $in: authorIds }, parentId: null, deletedAt: null },
      viewerId,
      cursor,
      limit,
    );
  }

  async replies(
    id: string,
    viewerId: string | null,
    cursor: string | null,
    limit: number,
  ): Promise<PostPage> {
    const { post } = await this.loadVisible(id, viewerId);
    return this.page(
      { parentId: post._id, deletedAt: null },
      viewerId,
      cursor,
      limit,
      {
        asc: true,
        checkVisibility: true,
      },
    );
  }

  private async page(
    filter: Record<string, unknown>,
    viewerId: string | null,
    cursor: string | null,
    limit: number,
    opts: PageOptions = {},
  ): Promise<PostPage> {
    const size = this.clamp(limit);
    const after = this.cursorId(cursor);
    const asc = opts.asc === true;
    const query = after
      ? { ...filter, _id: asc ? { $gt: after } : { $lt: after } }
      : filter;
    const rows = await this.posts
      .find(query)
      .sort({ _id: asc ? 1 : -1 })
      .limit(size + 1)
      .exec();
    const hasMore = rows.length > size;
    const slice = rows.slice(0, size);
    const items = await this.hydrate(
      slice,
      viewerId,
      opts.checkVisibility === true,
    );
    const last = slice[slice.length - 1];
    return { items, nextCursor: hasMore && last ? last.id : null };
  }
}
