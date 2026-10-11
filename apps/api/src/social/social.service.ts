import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type {
  ProfileListItem,
  ProfilePage,
  PublicProfile,
  UpdateProfileRequest,
} from '@narad/contracts';
import { User } from '../users/user.schema';
import { Follow } from './follow.schema';

const MAX_PAGE = 50;

const notFound = () =>
  new NotFoundException({ code: 'USER_NOT_FOUND', message: 'No such user.' });

interface UserLike {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
}

@Injectable()
export class SocialService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Follow.name) private readonly follows: Model<Follow>,
  ) {}

  private toProfile(
    u: UserLike,
    viewer: PublicProfile['viewer'],
  ): PublicProfile {
    return {
      id: u.id,
      handle: u.handle,
      displayName: u.displayName,
      bio: u.bio,
      followersCount: u.followersCount,
      followingCount: u.followingCount,
      createdAt: u.createdAt.toISOString(),
      viewer,
    };
  }

  private async findByHandle(handle: string) {
    const user = await this.users
      .findOne({ handle: handle.toLowerCase() })
      .exec();
    if (!user) throw notFound();
    return user;
  }

  async getProfile(
    handle: string,
    viewerId: string | null,
  ): Promise<PublicProfile> {
    const user = await this.findByHandle(handle);
    let viewer: PublicProfile['viewer'] = null;
    if (viewerId) {
      const isSelf = viewerId === user.id;
      const following = isSelf
        ? false
        : (await this.follows
            .exists({
              followerId: new Types.ObjectId(viewerId),
              followeeId: user._id,
            })
            .exec()) !== null;
      viewer = { following, isSelf };
    }
    return this.toProfile(user, viewer);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileRequest,
  ): Promise<PublicProfile> {
    const user = await this.users
      .findByIdAndUpdate(userId, { $set: input }, { new: true })
      .exec();
    if (!user) throw notFound();
    return this.toProfile(user, { following: false, isSelf: true });
  }

  async follow(viewerId: string, handle: string): Promise<void> {
    const target = await this.findByHandle(handle);
    if (target.id === viewerId) {
      throw new BadRequestException({
        code: 'CANNOT_FOLLOW_SELF',
        message: 'You cannot follow yourself.',
      });
    }
    const followerId = new Types.ObjectId(viewerId);
    // Upsert is idempotent: a repeat call matches the existing row and creates nothing.
    const result = await this.follows
      .updateOne(
        { followerId, followeeId: target._id },
        {
          $setOnInsert: {
            followerId,
            followeeId: target._id,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      )
      .exec();
    if (result.upsertedCount === 1) {
      await this.users
        .updateOne({ _id: target._id }, { $inc: { followersCount: 1 } })
        .exec();
      await this.users
        .updateOne({ _id: followerId }, { $inc: { followingCount: 1 } })
        .exec();
    }
  }

  async unfollow(viewerId: string, handle: string): Promise<void> {
    const target = await this.findByHandle(handle);
    const followerId = new Types.ObjectId(viewerId);
    const result = await this.follows
      .deleteOne({ followerId, followeeId: target._id })
      .exec();
    if (result.deletedCount === 1) {
      await this.users
        .updateOne({ _id: target._id }, { $inc: { followersCount: -1 } })
        .exec();
      await this.users
        .updateOne({ _id: followerId }, { $inc: { followingCount: -1 } })
        .exec();
    }
  }

  async listFollowers(
    handle: string,
    cursor: string | null,
    limit: number,
  ): Promise<ProfilePage> {
    const target = await this.findByHandle(handle);
    return this.page({ followeeId: target._id }, 'followerId', cursor, limit);
  }

  async listFollowing(
    handle: string,
    cursor: string | null,
    limit: number,
  ): Promise<ProfilePage> {
    const target = await this.findByHandle(handle);
    return this.page({ followerId: target._id }, 'followeeId', cursor, limit);
  }

  private async page(
    base: Record<string, unknown>,
    otherSide: 'followerId' | 'followeeId',
    cursor: string | null,
    limit: number,
  ): Promise<ProfilePage> {
    const size = Math.min(Math.max(Math.trunc(limit) || 20, 1), MAX_PAGE);
    if (cursor !== null && !Types.ObjectId.isValid(cursor)) {
      throw new BadRequestException({
        code: 'BAD_CURSOR',
        message: 'Invalid cursor.',
      });
    }
    const filter = cursor
      ? { ...base, _id: { $lt: new Types.ObjectId(cursor) } }
      : base;
    const rows = await this.follows
      .find(filter)
      .sort({ _id: -1 })
      .limit(size + 1)
      .exec();
    const hasMore = rows.length > size;
    const slice = rows.slice(0, size);
    const people = await this.users
      .find({ _id: { $in: slice.map((r) => r[otherSide]) } })
      .exec();
    const byId = new Map(people.map((p) => [p.id, p]));
    const items: ProfileListItem[] = [];
    for (const r of slice) {
      const p = byId.get(r[otherSide].toString());
      if (p)
        items.push({ id: p.id, handle: p.handle, displayName: p.displayName });
    }
    const last = slice[slice.length - 1];
    return { items, nextCursor: hasMore && last ? last.id : null };
  }
}
