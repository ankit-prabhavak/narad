import { BadRequestException, NotFoundException } from '@nestjs/common';
import { type Model, Types } from 'mongoose';
import type { ImageService } from './image.service';
import type { MediaAsset } from './media-asset.schema';
import { MediaAssetService } from './media-asset.service';
import type { ObjectStorage } from './storage';

interface Chain<T> {
  limit: () => Chain<T>;
  exec: () => Promise<T>;
}
function chain<T>(value: T): Chain<T> {
  const c: Chain<T> = { limit: () => c, exec: () => Promise.resolve(value) };
  return c;
}

const USER = new Types.ObjectId().toString();
const POST = new Types.ObjectId();
const newId = () => new Types.ObjectId().toString();

interface Doc {
  id: string;
  _id: Types.ObjectId;
  key: string;
  width: number;
  height: number;
}
const doc = (id: string, key = 'posts/u/' + id + '.webp'): Doc => ({
  id,
  _id: new Types.ObjectId(id),
  key,
  width: 800,
  height: 600,
});

interface Opts {
  pending?: number;
  modified?: number;
  docs?: Doc[];
  owned?: Doc | null;
  deletedCount?: number;
  createError?: Error;
}

function setup(o: Opts = {}) {
  const files = new Map<string, Buffer>();
  const created: Array<Record<string, unknown>> = [];
  const updates: Array<{
    filter: Record<string, unknown>;
    update: Record<string, unknown>;
  }> = [];
  const deletedMany: unknown[] = [];

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
  const assets = {
    countDocuments: () => chain(o.pending ?? 0),
    create: (d: Record<string, unknown>) => {
      if (o.createError) return Promise.reject(o.createError);
      created.push(d);
      return Promise.resolve({ id: 'asset1', ...d });
    },
    updateMany: (
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
    ) => {
      updates.push({ filter, update });
      return chain({ modifiedCount: o.modified ?? 0 });
    },
    find: () => chain(o.docs ?? []),
    deleteMany: (f: unknown) => {
      deletedMany.push(f);
      return chain({});
    },
    deleteOne: () => chain({ deletedCount: o.deletedCount ?? 1 }),
    findOneAndDelete: () => chain(o.owned ?? null),
  } as unknown as Model<MediaAsset>;
  const images = {
    toPostImage: () =>
      Promise.resolve({ data: Buffer.from('img'), width: 800, height: 600 }),
  } as unknown as ImageService;

  return {
    svc: new MediaAssetService(assets, storage, images),
    files,
    created,
    updates,
    deletedMany,
  };
}

describe('MediaAssetService.upload', () => {
  it('stores the image under a server-generated key and records it', async () => {
    const { svc, files, created } = setup();
    const out = await svc.upload(USER, Buffer.from('raw'));
    const key = [...files.keys()][0] ?? '';
    expect(key).toMatch(new RegExp('^posts/' + USER + '/[a-f0-9]{32}\\.webp$'));
    expect(out).toEqual({
      id: 'asset1',
      url: '/api/v1/media/' + key,
      width: 800,
      height: 600,
    });
    expect(created[0]).toMatchObject({
      key,
      width: 800,
      height: 600,
      bytes: 3,
    });
  });

  it('refuses new uploads once 20 are waiting, and stores nothing', async () => {
    const { svc, files } = setup({ pending: 20 });
    await expect(svc.upload(USER, Buffer.from('raw'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(files.size).toBe(0);
  });

  it('removes the file again if saving the record fails', async () => {
    const { svc, files } = setup({ createError: new Error('db down') });
    await expect(svc.upload(USER, Buffer.from('raw'))).rejects.toThrow(
      'db down',
    );
    expect(files.size).toBe(0);
  });
});

describe('MediaAssetService.claim', () => {
  it('does nothing for no images', async () => {
    const { svc, updates } = setup();
    await expect(svc.claim(USER, [], POST)).resolves.toEqual([]);
    expect(updates).toHaveLength(0);
  });

  it('attaches the images and returns them in the requested order', async () => {
    const a = newId();
    const b = newId();
    const { svc, updates } = setup({ modified: 2, docs: [doc(b), doc(a)] });
    const out = await svc.claim(USER, [a, b], POST);
    expect(out.map((i) => i.key)).toEqual([doc(a).key, doc(b).key]);
    expect(updates[0]?.filter).toMatchObject({ postId: null });
    expect(updates[0]?.update).toEqual({ $set: { postId: POST } });
  });

  it('fails and releases everything when any image cannot be claimed', async () => {
    const { svc, updates } = setup({ modified: 1 });
    await expect(
      svc.claim(USER, [newId(), newId()], POST),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updates).toHaveLength(2);
    expect(updates[1]?.filter).toEqual({ postId: POST });
    expect(updates[1]?.update).toEqual({ $set: { postId: null } });
  });

  it.each([
    [
      'the same image twice',
      () => [newId(), newId()].map((_, __, arr) => arr[0] ?? ''),
    ],
    ['a malformed id', () => ['nope']],
    ['more than 4 images', () => [1, 2, 3, 4, 5].map(newId)],
  ])('rejects %s without touching the database', async (_name, make) => {
    const { svc, updates } = setup({ modified: 5 });
    const ids = make();
    await expect(svc.claim(USER, ids, POST)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(updates).toHaveLength(0);
  });
});

describe('MediaAssetService cleanup', () => {
  it('deletes the files and records of a post', async () => {
    const a = doc(newId());
    const { svc, files, deletedMany } = setup({ docs: [a] });
    files.set(a.key, Buffer.from('x'));
    await svc.deleteForPost(POST);
    expect(files.size).toBe(0);
    expect(deletedMany[0]).toEqual({ postId: POST });
  });

  it('lets only the owner delete an unattached image', async () => {
    const stranger = setup({ owned: null });
    await expect(
      stranger.svc.deleteOwnedPending(USER, newId()),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      stranger.svc.deleteOwnedPending(USER, 'nope'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const a = doc(newId());
    const owner = setup({ owned: a });
    owner.files.set(a.key, Buffer.from('x'));
    await owner.svc.deleteOwnedPending(USER, a.id);
    expect(owner.files.size).toBe(0);
  });

  it('purges abandoned images, and keeps any that were attached in the meantime', async () => {
    const a = doc(newId());
    const gone = setup({ docs: [a], deletedCount: 1 });
    gone.files.set(a.key, Buffer.from('x'));
    await expect(gone.svc.purgeAbandoned(1000)).resolves.toBe(1);
    expect(gone.files.size).toBe(0);

    const b = doc(newId());
    const raced = setup({ docs: [b], deletedCount: 0 });
    raced.files.set(b.key, Buffer.from('x'));
    await raced.svc.purgeAbandoned(1000);
    expect(raced.files.size).toBe(1);
  });
});
