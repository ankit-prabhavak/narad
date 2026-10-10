import { RegisterRequest } from '@narad/contracts';

const valid = {
  email: 'Asha@Example.com ',
  handle: ' Asha_K',
  displayName: 'आशा',
  password: 'correct-horse-battery',
};

describe('RegisterRequest', () => {
  it('normalizes email and handle', () => {
    const r = RegisterRequest.parse(valid);
    expect(r.email).toBe('asha@example.com');
    expect(r.handle).toBe('asha_k');
  });

  it('accepts Devanagari display names', () => {
    expect(RegisterRequest.parse(valid).displayName).toBe('आशा');
  });

  it.each([
    ['unknown field (role)', { ...valid, role: 'admin' }],
    ['short password', { ...valid, password: 'short' }],
    ['huge password', { ...valid, password: 'x'.repeat(129) }],
    ['bad handle', { ...valid, handle: 'a b' }],
    ['bad email', { ...valid, email: 'nope' }],
  ])('rejects %s', (_name, body) => {
    expect(RegisterRequest.safeParse(body).success).toBe(false);
  });
});
