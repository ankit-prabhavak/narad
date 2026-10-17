import { CreatePostRequest, EditPostRequest } from '@narad/contracts';

describe('CreatePostRequest', () => {
  it('defaults the language to English and trims the text', () => {
    const r = CreatePostRequest.parse({ text: '  hello  ' });
    expect(r.text).toBe('hello');
    expect(r.language).toBe('en');
  });

  it('accepts Hindi text', () => {
    expect(
      CreatePostRequest.parse({ text: 'बारिश में चाय का मज़ा', language: 'hi' })
        .language,
    ).toBe('hi');
  });

  it('allows exactly 300 characters and rejects 301', () => {
    expect(CreatePostRequest.safeParse({ text: 'x'.repeat(300) }).success).toBe(
      true,
    );
    expect(CreatePostRequest.safeParse({ text: 'x'.repeat(301) }).success).toBe(
      false,
    );
  });

  it('counts a multi-part emoji as one character, not several', () => {
    const family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}';
    expect(family.length).toBeGreaterThan(5);
    expect(
      CreatePostRequest.safeParse({ text: family.repeat(300) }).success,
    ).toBe(true);
    expect(
      CreatePostRequest.safeParse({ text: family.repeat(301) }).success,
    ).toBe(false);
  });

  it.each([
    ['blank text', { text: '   ' }],
    [
      'client-supplied author',
      { text: 'hi', authorId: '507f1f77bcf86cd799439011' },
    ],
    ['unknown language', { text: 'hi', language: 'xx' }],
    ['extra field', { text: 'hi', role: 'admin' }],
  ])('rejects %s', (_name, body) => {
    expect(CreatePostRequest.safeParse(body).success).toBe(false);
  });
});

describe('EditPostRequest', () => {
  it('only allows the text', () => {
    expect(EditPostRequest.safeParse({ text: 'edited' }).success).toBe(true);
    expect(
      EditPostRequest.safeParse({ text: 'edited', language: 'hi' }).success,
    ).toBe(false);
  });
});
