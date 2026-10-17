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
  id: string;
  authorId: Types.ObjectId;
  text: string;
  language: 'en' | 'hi';
  createdAt: Date;
  editedAt: Date | null;
}

type Visibility = 'ok' | 'blocked' | 'private';

function toDto(p: PostLike, a: AuthorLike): PostDto {
  return {
    id: p.id,
    text: p.text,
    language: p.language,
    createdAt: p.createdAt.toISOString(),
    editedAt: p.editedAt ? p.editedAt.toISOString() : null,
    author: { id: a.id, handle: a.handle, displayName: a.displayName },
  };
}

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly posts: Model<Post>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Follow.name) private readonly follows: Model<Follow>,
    @InjectModel(Block.name) private readonly blocks: Model<Block>,
    @InjectModel(Mute.name) private readonly mutes: Model<Mute>,
  ) {}

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

  async create(authorId: string, input: CreatePostRequest): Promise<PostDto> {
    const author = await this.users.findById(authorId).exec();
    if (!author) throw userNotFound();
    const post = await this.posts.create({
      authorId: oid(authorId),
      text: input.text,
      language: input.language,
    });
    return toDto(post, author);
  }

  async get(id: string, viewerId: string | null): Promise<PostDto> {
    if (!Types.ObjectId.isValid(id)) throw postNotFound();
    const post = await this.posts
      .findOne({ _id: oid(id), deletedAt: null })
      .exec();
    if (!post) throw postNotFound();
    const author = await this.users.findById(post.authorId).exec();
    if (!author) throw postNotFound();
    if ((await this.visibility(author, viewerId)) !== 'ok')
      throw postNotFound();
    return toDto(post, author);
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
    const author = await this.users.findById(userId).exec();
    if (!author) throw userNotFound();
    return toDto(post, author);
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw postNotFound();
    const result = await this.posts
      .updateOne(
        { _id: oid(id), authorId: oid(userId), deletedAt: null },
        { deletedAt: new Date() },
      )
      .exec();
    if (result.matchedCount === 0) throw postNotFound();
  }

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
    return this.page({ authorId: author._id, deletedAt: null }, cursor, limit);
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
      { authorId: { $in: authorIds }, deletedAt: null },
      cursor,
      limit,
    );
  }

  private async page(
    filter: Record<string, unknown>,
    cursor: string | null,
    limit: number,
  ): Promise<PostPage> {
    const size = Math.min(Math.max(Math.trunc(limit) || 20, 1), MAX_PAGE);
    let query = filter;
    if (cursor !== null) {
      if (!Types.ObjectId.isValid(cursor)) {
        throw new BadRequestException({
          code: 'BAD_CURSOR',
          message: 'Invalid cursor.',
        });
      }
      query = { ...filter, _id: { $lt: oid(cursor) } };
    }
    const rows = await this.posts
      .find(query)
      .sort({ _id: -1 })
      .limit(size + 1)
      .exec();
    const hasMore = rows.length > size;
    const slice = rows.slice(0, size);
    const authorIds = [...new Set(slice.map((r) => r.authorId.toString()))].map(
      oid,
    );
    const authors = await this.users.find({ _id: { $in: authorIds } }).exec();
    const byId = new Map(authors.map((a) => [a.id, a]));
    const items: PostDto[] = [];
    for (const r of slice) {
      const a = byId.get(r.authorId.toString());
      if (a) items.push(toDto(r, a));
    }
    const last = slice[slice.length - 1];
    return { items, nextCursor: hasMore && last ? last.id : null };
  }
}
