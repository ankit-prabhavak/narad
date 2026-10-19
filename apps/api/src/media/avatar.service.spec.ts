import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { User } from '../users/user.schema';
import { AvatarService } from './avatar.service';
import type { ImageService } from './image.service';
import type { ObjectStorage } from './storage';

const USER = '507f1f77bcf86cd799439011';

function setup(previous: { avatarKey: string | null } | null) {
  const files = new Map<string, Buffer>();
  const updates: unknown[] = [];
  const storage: ObjectStorage = {
    put: (key, data) => {
      files.set(key, data);
      return Promise.resolve();
    },
    get: (key) => Promise.resolve(files.get(key) ?? null),
    delete: (key) => {
      files.delete(key);
      return Promise.resolve();
    },
  };
  const users = {
    findByIdAndUpdate: (_id: string, update: unknown) => {
      updates.push(update);
      return { exec: () => Promise.resolve(previous) };
    },
  } as unknown as Model<User>;
  const images = {
    toAvatar: (input: Buffer) =>
      input.length === 0
        ? Promise.reject(
            new BadRequestException({ code: 'INVALID_IMAGE', message: 'bad' }),
          )
        : Promise.resolve(Buffer.from('processed')),
  } as unknown as ImageService;
  return { svc: new AvatarService(users, storage, images), files, updates };
}

describe('AvatarService', () => {
  it('stores the processed image under a server-generated key and saves it on the user', async () => {
    const { svc, files, updates } = setup({ avatarKey: null });
    const { avatarUrl } = await svc.set(USER, Buffer.from('raw'));
    const key = [...files.keys()][0] ?? '';
    expect(key).toMatch(
      new RegExp('^avatars/' + USER + '/[a-f0-9]{32}\\.webp$'),
    );
    expect(files.get(key)?.toString()).toBe('processed');
    expect(avatarUrl).toBe('/api/v1/media/' + key);
    expect(updates[0]).toEqual({ $set: { avatarKey: key } });
  });

  it('deletes the previous picture when it is replaced', async () => {
    const { svc, files } = setup({
      avatarKey: 'avatars/' + USER + '/old.webp',
    });
    files.set('avatars/' + USER + '/old.webp', Buffer.from('old'));
    await svc.set(USER, Buffer.from('raw'));
    expect(files.has('avatars/' + USER + '/old.webp')).toBe(false);
    expect(files.size).toBe(1);
  });

  it('writes nothing for an invalid image', async () => {
    const { svc, files, updates } = setup({ avatarKey: null });
    await expect(svc.set(USER, Buffer.alloc(0))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(files.size).toBe(0);
    expect(updates).toHaveLength(0);
  });

  it('removes the new file again when the user does not exist', async () => {
    const { svc, files } = setup(null);
    await expect(svc.set(USER, Buffer.from('raw'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(files.size).toBe(0);
  });

  it('removes the picture and clears it on the user', async () => {
    const { svc, files, updates } = setup({
      avatarKey: 'avatars/' + USER + '/old.webp',
    });
    files.set('avatars/' + USER + '/old.webp', Buffer.from('old'));
    await svc.remove(USER);
    expect(files.size).toBe(0);
    expect(updates[0]).toEqual({ $set: { avatarKey: null } });
  });
});
