import { UpdateProfileRequest } from '@narad/contracts';

describe('UpdateProfileRequest', () => {
  it('accepts a Hindi bio', () => {
    expect(
      UpdateProfileRequest.parse({ bio: 'नमस्ते, मैं दिल्ली से हूँ' }).bio,
    ).toContain('दिल्ली');
  });

  it.each([
    ['empty body', {}],
    ['unknown field', { displayName: 'A', role: 'admin' }],
    ['follower count tampering', { followersCount: 9999 }],
    ['bio too long', { bio: 'x'.repeat(161) }],
    ['blank display name', { displayName: '   ' }],
  ])('rejects %s', (_name, body) => {
    expect(UpdateProfileRequest.safeParse(body).success).toBe(false);
  });
});
