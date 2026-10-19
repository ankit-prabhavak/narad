import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';

const MAX_INPUT_PIXELS = 40_000_000;
const ALLOWED_FORMATS = new Set<string>(['jpeg', 'png', 'webp']);

const invalidImage = () =>
  new BadRequestException({
    code: 'INVALID_IMAGE',
    message: 'Please upload a JPEG, PNG or WebP image.',
  });

@Injectable()
export class ImageService {
  /** Checks the real file contents, then re-encodes to a square WebP with all metadata removed. */
  async toAvatar(input: Buffer): Promise<Buffer> {
    try {
      const meta = await sharp(input, {
        limitInputPixels: MAX_INPUT_PIXELS,
      }).metadata();
      if (!meta.format || !ALLOWED_FORMATS.has(meta.format))
        throw invalidImage();
      return await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize(512, 512, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw invalidImage();
    }
  }
}
