jest.mock('argon2', () => {
  return {
    __esModule: true,
    default: {
      hash: async (password: string) => `hashed-${password}`,
      verify: async (hash: string, password: string) => hash === `hashed-${password}`,
      argon2id: 2,
    },
    argon2id: 2,
  };
});

import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyAccessToken,
} from '../../src/core/security/auth.utils';

describe('Authentication Security Utilities', () => {
  const password = 'StrongPassword123!';

  it('should hash a password and verify it successfully', async () => {
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash).toEqual(`hashed-${password}`);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isFailedMatch = await verifyPassword('WrongPassword', hash);
    expect(isFailedMatch).toBe(false);
  });

  it('should issue and verify valid JSON Web Tokens (JWT)', () => {
    const payload = {
      userId: 'user-uuid-mock',
      email: 'test@example.com',
      roles: ['CHAMPION'],
    };

    const token = generateAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toEqual(payload.userId);
    expect(decoded.email).toEqual(payload.email);
    expect(decoded.roles).toEqual(payload.roles);
  });
});
