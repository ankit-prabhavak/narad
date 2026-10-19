import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'node:crypto';
import { type Model, Types } from 'mongoose';
import { mediaUrl } from './avatar-url';
import { ImageService } from './image.service';
import { MediaAsset } from './media-asset.schema';
import { type ObjectStorage, STORAGE } from './storage';

export const MAX_IMAGES_PER_POST = 4;
const MAX_PENDING = 20;
const PURGE_BATCH = 200;
const oid = (id: string) => new Types.ObjectId(id);

export interface PostImageRecord {
  key: string;
  width: number;
  height: number;
}

export interface UploadedImage {
  id: string;
  url: string;
  width: number;
  height: number;
}

const invalidMedia = () =>
  new BadRequestException({
    code: 'INVALID_MEDIA',
    message: 'One of the images cannot be used. Please upload it again.',
  });

const imageNotFound = () =>
  new NotFoundException({ code: 'IMAGE_NOT_FOUND', message: 'No such image.' });

@Injectable()
export class MediaAssetService {
  constructor(
    @InjectModel(MediaAsset.name) private readonly assets: Model<MediaAsset>,
    @Inject(STORAGE) private readonly storage: ObjectStorage,
    private readonly images: ImageService,
  ) {}

  async upload(userId: string, input: Buffer): Promise<UploadedImage> {
    const pending = await this.assets
      .countDocuments({ ownerId: oid(userId), postId: null })
      .exec();
    if (pending >= MAX_PENDING) {
      throw new BadRequestException({
        code: 'TOO_MANY_PENDING_IMAGES',
        message: 'Too many unattached images. Post them or remove some first.',
      });
    }
    const { data, width, height } = await this.images.toPostImage(input);
    const key = `posts/${userId}/${randomBytes(16).toString('hex')}.webp`;
    await this.storage.put(key, data, 'image/webp');
    try {
      const doc = await this.assets.create({
        ownerId: oid(userId),
        key,
        width,
        height,
        bytes: data.length,
      });
      return { id: doc.id, url: mediaUrl(key), width, height };
    } catch (err) {
      await this.storage.delete(key).catch(() => undefined);
      throw err;
    }
  }

  /**
   * Attaches the caller's unattached images to `postId`, atomically per image.
   * Fails (and attaches nothing) if any image is missing, already used, or not theirs.
   */
  async claim(
    userId: string,
    ids: string[],
    postId: Types.ObjectId,
  ): Promise<PostImageRecord[]> {
    if (ids.length === 0) return [];
    if (
      ids.length > MAX_IMAGES_PER_POST ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !Types.ObjectId.isValid(id))
    ) {
      throw invalidMedia();
    }
    const objectIds = ids.map(oid);
    const res = await this.assets
      .updateMany(
        { _id: { $in: objectIds }, ownerId: oid(userId), postId: null },
        { $set: { postId } },
      )
      .exec();
    if (res.modifiedCount !== ids.length) {
      await this.release(postId);
      throw invalidMedia();
    }
    const docs = await this.assets
      .find({ _id: { $in: objectIds }, postId })
      .exec();
    const byId = new Map(docs.map((d) => [d.id, d]));
    const records: PostImageRecord[] = [];
    for (const id of ids) {
      const d = byId.get(id);
      if (!d) {
        await this.release(postId);
        throw invalidMedia();
      }
      records.push({ key: d.key, width: d.width, height: d.height });
    }
    return records;
  }

  /** Makes images claimed by `postId` unattached again (used when post creation fails). */
  async release(postId: Types.ObjectId): Promise<void> {
    await this.assets.updateMany({ postId }, { $set: { postId: null } }).exec();
  }

  /** Deletes the files and records of every image attached to the post. */
  async deleteForPost(postId: Types.ObjectId): Promise<void> {
    const docs = await this.assets.find({ postId }).exec();
    for (const d of docs)
      await this.storage.delete(d.key).catch(() => undefined);
    await this.assets.deleteMany({ postId }).exec();
  }

  async deleteOwnedPending(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw imageNotFound();
    const doc = await this.assets
      .findOneAndDelete({ _id: oid(id), ownerId: oid(userId), postId: null })
      .exec();
    if (!doc) throw imageNotFound();
    await this.storage.delete(doc.key).catch(() => undefined);
  }

  /** Removes unattached images older than `maxAgeMs`. Returns how many were examined. */
  async purgeAbandoned(maxAgeMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const stale = await this.assets
      .find({ postId: null, createdAt: { $lt: cutoff } })
      .limit(PURGE_BATCH)
      .exec();
    for (const a of stale) {
      // Conditional delete: skip anything that was attached in the meantime.
      const res = await this.assets
        .deleteOne({ _id: a._id, postId: null })
        .exec();
      if (res.deletedCount === 1)
        await this.storage.delete(a.key).catch(() => undefined);
    }
    return stale.length;
  }
}
