import {
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { type ObjectStorage, STORAGE } from './storage';

const USER_ID = /^[a-f0-9]{24}$/;
const FILE = /^[a-f0-9]{32}\.webp$/;

@Controller('media')
export class MediaController {
  constructor(@Inject(STORAGE) private readonly storage: ObjectStorage) {}

  private async serve(
    prefix: 'avatars' | 'posts',
    userId: string,
    file: string,
  ) {
    const missing = () =>
      new NotFoundException({ code: 'NOT_FOUND', message: 'Not found.' });
    if (!USER_ID.test(userId) || !FILE.test(file)) throw missing();
    const data = await this.storage.get(`${prefix}/${userId}/${file}`);
    if (!data) throw missing();
    return new StreamableFile(data, { type: 'image/webp' });
  }

  @Get('avatars/:userId/:file')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  avatar(@Param('userId') userId: string, @Param('file') file: string) {
    return this.serve('avatars', userId, file);
  }

  @Get('posts/:userId/:file')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  postImage(@Param('userId') userId: string, @Param('file') file: string) {
    return this.serve('posts', userId, file);
  }
}
