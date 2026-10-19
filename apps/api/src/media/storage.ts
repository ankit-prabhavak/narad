export const STORAGE = Symbol('STORAGE');

export interface ObjectStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  /** Returns null when the object does not exist. */
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}
