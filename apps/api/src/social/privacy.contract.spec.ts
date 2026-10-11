import { UpdatePrivacyRequest } from '@narad/contracts';

describe('UpdatePrivacyRequest', () => {
  it('accepts a boolean', () => {
    expect(UpdatePrivacyRequest.parse({ isPrivate: true }).isPrivate).toBe(
      true,
    );
  });

  it.each([
    ['string value', { isPrivate: 'yes' }],
    ['missing field', {}],
    ['extra field', { isPrivate: true, role: 'admin' }],
  ])('rejects %s', (_name, body) => {
    expect(UpdatePrivacyRequest.safeParse(body).success).toBe(false);
  });
});
