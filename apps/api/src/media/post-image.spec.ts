import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { ImageService } from './image.service';

const solid = (w: number, h: number) =>
  sharp({
    create: { width: w, height: h, channels: 3, background: '#cc6633' },
  });

describe('ImageService.toPostImage', () => {
  const svc = new ImageService();

  it('shrinks a large image to 1600px on the longest side and keeps the aspect ratio', async () => {
    const out = await svc.toPostImage(await solid(3000, 2000).png().toBuffer());
    expect(out.width).toBe(1600);
    expect(Math.abs(out.height - 1067)).toBeLessThanOrEqual(1);
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(out.width);
    expect(meta.height).toBe(out.height);
  });

  it('does not enlarge a small image', async () => {
    const out = await svc.toPostImage(await solid(400, 300).jpeg().toBuffer());
    expect(out.width).toBe(400);
    expect(out.height).toBe(300);
  });

  it('removes metadata such as EXIF', async () => {
    const withExif = await solid(100, 100)
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: 'secret-location' } } })
      .toBuffer();
    const out = await svc.toPostImage(withExif);
    expect((await sharp(out.data).metadata()).exif).toBeUndefined();
    expect(out.data.toString('latin1')).not.toContain('secret-location');
  });

  it('rejects other formats, text and empty input', async () => {
    const tiff = await solid(50, 50).tiff().toBuffer();
    await expect(svc.toPostImage(tiff)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      svc.toPostImage(Buffer.from('not an image')),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.toPostImage(Buffer.alloc(0))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
