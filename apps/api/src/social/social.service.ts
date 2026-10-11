import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { Block } from './block.schema';
import { FollowRequest } from './follow-request.schema';
import { Follow } from './follow.schema';
import { Mute } from './mute.schema';

const MAX_PAGE = 50;
const oid = (id: string) => new Types.ObjectId(id);

const notFound = () =>
  new NotFoundException({ code: 'USER_NOT_FOUND', message: 'No such user.' });
const privateAccount = () =>
  new ForbiddenException({
    code: 'PRIVATE_ACCOUNT',
    message: 'This account is private.',
  });

const SELF_VIEWER = {
  following: false,
  isSelf: true,
  requested: false,
  blocking: false,
  muting: false,
};

interface UserLike {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
}

interface PageRow {
  id: string;
  other: Types.ObjectId;
}

@Injectable()
export class SocialService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Follow.name) private readonly follows: Model<Follow>,
    @InjectModel(Block.name) private readonly blocks: Model<Block>,
    @InjectModel(Mute.name) private readonly mutes: Model<Mute>,
    @InjectModel(FollowRequest.name)
    private readonly requests: Model<FollowRequest>,
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
      isPrivate: u.isPrivate,
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

  /** A user who has been blocked gets a plain 404, so they cannot tell the account exists. */
  private async assertNotBlockedBy(
    target: Types.ObjectId,
    viewerId: string,
  ): Promise<void> {
    const blocked = await this.blocks
      .exists({ blockerId: target, blockedId: oid(viewerId) })
      .exec();
    if (blocked !== null) throw notFound();
  }

  private async assertCanViewLists(
    target: { _id: Types.ObjectId; id: string; isPrivate: boolean },
    viewerId: string | null,
  ): Promise<void> {
    if (viewerId) {
      if (viewerId === target.id) return;
      await this.assertNotBlockedBy(target._id, viewerId);
    }
    if (!target.isPrivate) return;
    if (viewerId) {
      const follows = await this.follows
        .exists({ followerId: oid(viewerId), followeeId: target._id })
        .exec();
      if (follows !== null) return;
    }
    throw privateAccount();
  }

  async getProfile(
    handle: string,
    viewerId: string | null,
  ): Promise<PublicProfile> {
    const user = await this.findByHandle(handle);
    if (!viewerId) return this.toProfile(user, null);
    if (viewerId === user.id) return this.toProfile(user, SELF_VIEWER);

    await this.assertNotBlockedBy(user._id, viewerId);
    const me = oid(viewerId);
    const [following, requested, blocking, muting] = await Promise.all([
      this.follows.exists({ followerId: me, followeeId: user._id }).exec(),
      this.requests.exists({ requesterId: me, targetId: user._id }).exec(),
      this.blocks.exists({ blockerId: me, blockedId: user._id }).exec(),
      this.mutes.exists({ muterId: me, mutedId: user._id }).exec(),
    ]);
    return this.toProfile(user, {
      following: following !== null,
      isSelf: false,
      requested: requested !== null,
      blocking: blocking !== null,
      muting: muting !== null,
    });
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileRequest,
  ): Promise<PublicProfile> {
    const user = await this.users
      .findByIdAndUpdate(userId, { $set: input }, { new: true })
      .exec();
    if (!user) throw notFound();
    return this.toProfile(user, SELF_VIEWER);
  }

  async updatePrivacy(
    userId: string,
    isPrivate: boolean,
  ): Promise<PublicProfile> {
    const user = await this.users
      .findByIdAndUpdate(userId, { $set: { isPrivate } }, { new: true })
      .exec();
    if (!user) throw notFound();
    return this.toProfile(user, SELF_VIEWER);
  }

  // ---- follows -----------------------------------------------------------

  /** Idempotent. Counters move only when a row is really created. */
  private async createFollow(
    followerId: Types.ObjectId,
    followeeId: Types.ObjectId,
  ) {
    const result = await this.follows
      .updateOne(
        { followerId, followeeId },
        { $setOnInsert: { followerId, followeeId, createdAt: new Date() } },
        { upsert: true },
      )
      .exec();
    if (result.upsertedCount === 1) {
      await this.users
        .updateOne({ _id: followeeId }, { $inc: { followersCount: 1 } })
        .exec();
      await this.users
        .updateOne({ _id: followerId }, { $inc: { followingCount: 1 } })
        .exec();
    }
  }

  private async removeFollow(
    followerId: Types.ObjectId,
    followeeId: Types.ObjectId,
  ) {
    const result = await this.follows
      .deleteOne({ followerId, followeeId })
      .exec();
    if (result.deletedCount === 1) {
      await this.users
        .updateOne({ _id: followeeId }, { $inc: { followersCount: -1 } })
        .exec();
      await this.users
        .updateOne({ _id: followerId }, { $inc: { followingCount: -1 } })
        .exec();
    }
  }

  async follow(
    viewerId: string,
    handle: string,
  ): Promise<'following' | 'requested'> {
    const target = await this.findByHandle(handle);
    if (target.id === viewerId) {
      throw new BadRequestException({
        code: 'CANNOT_FOLLOW_SELF',
        message: 'You cannot follow yourself.',
      });
    }
    await this.assertNotBlockedBy(target._id, viewerId);
    const me = oid(viewerId);
    const iBlocked = await this.blocks
      .exists({ blockerId: me, blockedId: target._id })
      .exec();
    if (iBlocked !== null) {
      throw new ConflictException({
        code: 'UNBLOCK_FIRST',
        message: 'Unblock this user before following.',
      });
    }

    if (target.isPrivate) {
      const already = await this.follows
        .exists({ followerId: me, followeeId: target._id })
        .exec();
      if (already !== null) return 'following';
      await this.requests
        .updateOne(
          { requesterId: me, targetId: target._id },
          {
            $setOnInsert: {
              requesterId: me,
              targetId: target._id,
              createdAt: new Date(),
            },
          },
          { upsert: true },
        )
        .exec();
      return 'requested';
    }

    await this.requests
      .deleteOne({ requesterId: me, targetId: target._id })
      .exec();
    await this.createFollow(me, target._id);
    return 'following';
  }

  /** Also cancels a pending request. */
  async unfollow(viewerId: string, handle: string): Promise<void> {
    const target = await this.findByHandle(handle);
    const me = oid(viewerId);
    await this.removeFollow(me, target._id);
    await this.requests
      .deleteOne({ requesterId: me, targetId: target._id })
      .exec();
  }

  async approve(ownerId: string, requesterHandle: string): Promise<void> {
    const requester = await this.findByHandle(requesterHandle);
    // Atomic claim: two quick approvals cannot both create the follow.
    const claimed = await this.requests
      .findOneAndDelete({ requesterId: requester._id, targetId: oid(ownerId) })
      .exec();
    if (!claimed) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'No such follow request.',
      });
    }
    await this.createFollow(requester._id, oid(ownerId));
  }

  async decline(ownerId: string, requesterHandle: string): Promise<void> {
    const requester = await this.findByHandle(requesterHandle);
    await this.requests
      .deleteOne({ requesterId: requester._id, targetId: oid(ownerId) })
      .exec();
  }

  // ---- block and mute ----------------------------------------------------

  async block(viewerId: string, handle: string): Promise<void> {
    const target = await this.findByHandle(handle);
    if (target.id === viewerId) {
      throw new BadRequestException({
        code: 'CANNOT_BLOCK_SELF',
        message: 'You cannot block yourself.',
      });
    }
    const me = oid(viewerId);
    await this.blocks
      .updateOne(
        { blockerId: me, blockedId: target._id },
        {
          $setOnInsert: {
            blockerId: me,
            blockedId: target._id,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      )
      .exec();
    // Cleanup runs on every call, so a half-finished earlier attempt gets repaired.
    await this.removeFollow(me, target._id);
    await this.removeFollow(target._id, me);
    await this.requests
      .deleteMany({
        $or: [
          { requesterId: me, targetId: target._id },
          { requesterId: target._id, targetId: me },
        ],
      })
      .exec();
  }

  async unblock(viewerId: string, handle: string): Promise<void> {
    const target = await this.findByHandle(handle);
    await this.blocks
      .deleteOne({ blockerId: oid(viewerId), blockedId: target._id })
      .exec();
  }

  async mute(viewerId: string, handle: string): Promise<void> {
    const target = await this.findByHandle(handle);
    if (target.id === viewerId) {
      throw new BadRequestException({
        code: 'CANNOT_MUTE_SELF',
        message: 'You cannot mute yourself.',
      });
    }
    const me = oid(viewerId);
    await this.mutes
      .updateOne(
        { muterId: me, mutedId: target._id },
        {
          $setOnInsert: {
            muterId: me,
            mutedId: target._id,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async unmute(viewerId: string, handle: string): Promise<void> {
    const target = await this.findByHandle(handle);
    await this.mutes
      .deleteOne({ muterId: oid(viewerId), mutedId: target._id })
      .exec();
  }

  // ---- lists -------------------------------------------------------------

  async listFollowers(
    handle: string,
    viewerId: string | null,
    cursor: string | null,
    limit: number,
  ): Promise<ProfilePage> {
    const target = await this.findByHandle(handle);
    await this.assertCanViewLists(target, viewerId);
    const size = this.clampLimit(limit);
    const rows = await this.follows
      .find(this.cursorFilter({ followeeId: target._id }, cursor))
      .sort({ _id: -1 })
      .limit(size + 1)
      .exec();
    return this.toPage(
      rows.map((r) => ({ id: r.id, other: r.followerId })),
      size,
    );
  }

  async listFollowing(
    handle: string,
    viewerId: string | null,
    cursor: string | null,
    limit: number,
  ): Promise<ProfilePage> {
    const target = await this.findByHandle(handle);
    await this.assertCanViewLists(target, viewerId);
    const size = this.clampLimit(limit);
    const rows = await this.follows
      .find(this.cursorFilter({ followerId: target._id }, cursor))
      .sort({ _id: -1 })
      .limit(size + 1)
      .exec();
    return this.toPage(
      rows.map((r) => ({ id: r.id, other: r.followeeId })),
      size,
    );
  }

  async listRequests(
    ownerId: string,
    cursor: string | null,
    limit: number,
  ): Promise<ProfilePage> {
    const size = this.clampLimit(limit);
    const rows = await this.requests
      .find(this.cursorFilter({ targetId: oid(ownerId) }, cursor))
      .sort({ _id: -1 })
      .limit(size + 1)
      .exec();
    return this.toPage(
      rows.map((r) => ({ id: r.id, other: r.requesterId })),
      size,
    );
  }

  async listBlocks(
    viewerId: string,
    cursor: string | null,
    limit: number,
  ): Promise<ProfilePage> {
    const size = this.clampLimit(limit);
    const rows = await this.blocks
      .find(this.cursorFilter({ blockerId: oid(viewerId) }, cursor))
      .sort({ _id: -1 })
      .limit(size + 1)
      .exec();
    return this.toPage(
      rows.map((r) => ({ id: r.id, other: r.blockedId })),
      size,
    );
  }

  async listMutes(
    viewerId: string,
    cursor: string | null,
    limit: number,
  ): Promise<ProfilePage> {
    const size = this.clampLimit(limit);
    const rows = await this.mutes
      .find(this.cursorFilter({ muterId: oid(viewerId) }, cursor))
      .sort({ _id: -1 })
      .limit(size + 1)
      .exec();
    return this.toPage(
      rows.map((r) => ({ id: r.id, other: r.mutedId })),
      size,
    );
  }

  private clampLimit(limit: number): number {
    return Math.min(Math.max(Math.trunc(limit) || 20, 1), MAX_PAGE);
  }

  private cursorFilter(base: Record<string, unknown>, cursor: string | null) {
    if (cursor === null) return base;
    if (!Types.ObjectId.isValid(cursor)) {
      throw new BadRequestException({
        code: 'BAD_CURSOR',
        message: 'Invalid cursor.',
      });
    }
    return { ...base, _id: { $lt: new Types.ObjectId(cursor) } };
  }

  private async toPage(rows: PageRow[], size: number): Promise<ProfilePage> {
    const hasMore = rows.length > size;
    const slice = rows.slice(0, size);
    const people = await this.users
      .find({ _id: { $in: slice.map((r) => r.other) } })
      .exec();
    const byId = new Map(people.map((p) => [p.id, p]));
    const items: ProfileListItem[] = [];
    for (const r of slice) {
      const p = byId.get(r.other.toString());
      if (p)
        items.push({ id: p.id, handle: p.handle, displayName: p.displayName });
    }
    const last = slice[slice.length - 1];
    return { items, nextCursor: hasMore && last ? last.id : null };
  }
}
