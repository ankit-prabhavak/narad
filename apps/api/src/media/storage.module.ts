import { Module } from '@nestjs/common';
import { resolve } from 'node:path';
import { env } from '../config/env';
import { LocalDiskStorage } from './local-disk.storage';
import { type ObjectStorage, STORAGE } from './storage';

@Module({
  providers: [
    {
      provide: STORAGE,
      useFactory: (): ObjectStorage => {
        if (env.NODE_ENV === 'production') {
          throw new Error(
            'No object storage is configured for production. Add the S3 storage first.',
          );
        }
        return new LocalDiskStorage(resolve(process.cwd(), 'uploads'));
      },
    },
  ],
  exports: [STORAGE],
})
export class StorageModule {}
