import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDiskStorage } from './local-disk.storage';

describe('LocalDiskStorage', () => {
  let dir: string;
  let storage: LocalDiskStorage;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'narad-storage-'));
    storage = new LocalDiskStorage(dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('stores, reads and deletes an object', async () => {
    await storage.put('avatars/u1/a.webp', Buffer.from('hello'));
    expect((await storage.get('avatars/u1/a.webp'))?.toString()).toBe('hello');
    await storage.delete('avatars/u1/a.webp');
    await expect(storage.get('avatars/u1/a.webp')).resolves.toBeNull();
  });

  it('returns null for a missing object and ignores deleting one', async () => {
    await expect(storage.get('nope/x.webp')).resolves.toBeNull();
    await expect(storage.delete('nope/x.webp')).resolves.toBeUndefined();
  });

  it('refuses keys that escape the storage root', async () => {
    await expect(
      storage.put('../escape.txt', Buffer.from('x')),
    ).rejects.toThrow('Invalid storage key');
    await expect(storage.get('../../etc/passwd')).rejects.toThrow(
      'Invalid storage key',
    );
    await expect(storage.delete('..')).rejects.toThrow('Invalid storage key');
  });
});
