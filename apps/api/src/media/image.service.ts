import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';

const MAX_INPUT_PIXELS = 40_000_000;
const ALLOWED_FORMATS = new Set<string>(['jpeg', 'png', 'webp']);
const POST_IMAGE_MAX_SIDE = 1600;

const invalidImage = () =>
  new BadRequestException({
    code: 'INVALID_IMAGE',
    message: 'Please upload a JPEG, PNG or WebP image.',
  });

@Injectable()
export class ImageService {
  private async assertAllowed(input: Buffer): Promise<void> {
    const meta = await sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw invalidImage();
  }

  /** Checks the real file contents, then re-encodes to a square WebP with all metadata removed. */
  async toAvatar(input: Buffer): Promise<Buffer> {
    try {
      await this.assertAllowed(input);
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

  /** Re-encodes to WebP, at most 1600px on the longest side, never enlarged, metadata removed. */
  async toPostImage(
    input: Buffer,
  ): Promise<{ data: Buffer; width: number; height: number }> {
    try {
      await this.assertAllowed(input);
      const { data, info } = await sharp(input, {
        limitInputPixels: MAX_INPUT_PIXELS,
      })
        .rotate()
        .resize({
          width: POST_IMAGE_MAX_SIDE,
          height: POST_IMAGE_MAX_SIDE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      return { data, width: info.width, height: info.height };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw invalidImage();
    }
  }
}
