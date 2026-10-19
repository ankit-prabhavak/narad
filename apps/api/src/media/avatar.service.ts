import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'node:crypto';
import type { Model } from 'mongoose';
import { User } from '../users/user.schema';
import { mediaUrl } from './avatar-url';
import { ImageService } from './image.service';
import { type ObjectStorage, STORAGE } from './storage';

@Injectable()
export class AvatarService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @Inject(STORAGE) private readonly storage: ObjectStorage,
    private readonly images: ImageService,
  ) {}

  async set(userId: string, input: Buffer): Promise<{ avatarUrl: string }> {
    const data = await this.images.toAvatar(input);
    const key = `avatars/${userId}/${randomBytes(16).toString('hex')}.webp`;
    await this.storage.put(key, data, 'image/webp');

    let previous: { avatarKey: string | null } | null;
    try {
      previous = await this.users
        .findByIdAndUpdate(userId, { $set: { avatarKey: key } }, { new: false })
        .exec();
    } catch (err) {
      await this.storage.delete(key).catch(() => undefined);
      throw err;
    }
    if (!previous) {
      await this.storage.delete(key).catch(() => undefined);
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'No such user.',
      });
    }
    if (previous.avatarKey)
      await this.storage.delete(previous.avatarKey).catch(() => undefined);
    return { avatarUrl: mediaUrl(key) };
  }

  async remove(userId: string): Promise<void> {
    const previous = await this.users
      .findByIdAndUpdate(userId, { $set: { avatarKey: null } }, { new: false })
      .exec();
    if (previous?.avatarKey)
      await this.storage.delete(previous.avatarKey).catch(() => undefined);
  }
}
