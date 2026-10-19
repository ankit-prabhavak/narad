import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { ImageService } from './image.service';

const solid = (w: number, h: number) =>
  sharp({
    create: { width: w, height: h, channels: 3, background: '#3366cc' },
  });

describe('ImageService.toAvatar', () => {
  const svc = new ImageService();

  it.each([
    ['PNG', () => solid(800, 400).png().toBuffer()],
    ['JPEG', () => solid(300, 600).jpeg().toBuffer()],
    ['WebP', () => solid(200, 200).webp().toBuffer()],
  ])('accepts %s and returns a 512x512 WebP', async (_name, make) => {
    const out = await svc.toAvatar(await make());
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it('removes metadata such as EXIF', async () => {
    const withExif = await solid(100, 100)
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: 'secret-location' } } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const out = await svc.toAvatar(withExif);
    expect((await sharp(out).metadata()).exif).toBeUndefined();
    expect(out.toString('latin1')).not.toContain('secret-location');
  });

  it('rejects a real image in a format that is not allowed', async () => {
    const tiff = await solid(50, 50).tiff().toBuffer();
    await expect(svc.toAvatar(tiff)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects text pretending to be an image, and empty input', async () => {
    await expect(
      svc.toAvatar(Buffer.from('this is not an image')),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.toAvatar(Buffer.alloc(0))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects images with too many pixels', async () => {
    const huge = await solid(7000, 7000).png().toBuffer();
    await expect(svc.toAvatar(huge)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
