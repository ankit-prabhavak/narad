import { CreatePostRequest } from '@narad/contracts';

const id = (n: number) => String(n).padStart(24, 'a');

describe('CreatePostRequest with images', () => {
  it('defaults to no images', () => {
    expect(CreatePostRequest.parse({ text: 'hello' }).imageIds).toEqual([]);
  });

  it('allows an image-only post', () => {
    const r = CreatePostRequest.parse({ text: '   ', imageIds: [id(1)] });
    expect(r.text).toBe('');
    expect(r.imageIds).toEqual([id(1)]);
  });

  it('allows up to 4 images', () => {
    const ids = [id(1), id(2), id(3), id(4)];
    expect(
      CreatePostRequest.safeParse({ text: 'x', imageIds: ids }).success,
    ).toBe(true);
  });

  it.each([
    ['nothing at all', { text: '' }],
    ['blank text and no images', { text: '   ', imageIds: [] }],
    ['5 images', { text: 'x', imageIds: [id(1), id(2), id(3), id(4), id(5)] }],
    ['the same image twice', { text: 'x', imageIds: [id(1), id(1)] }],
    ['a malformed id', { text: 'x', imageIds: ['nope'] }],
    ['a non-array', { text: 'x', imageIds: id(1) }],
    ['extra fields', { text: 'x', images: [] }],
  ])('rejects %s', (_name, body) => {
    expect(CreatePostRequest.safeParse(body).success).toBe(false);
  });
});
