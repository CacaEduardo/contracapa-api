import { UserDocument } from 'src/modules/users/schemas/user.schema';
import { toPublicUser } from 'src/modules/users/user-response';

describe('toPublicUser', () => {
  const user = {
    _id: { toString: () => 'user-id' },
    name: 'Ana',
    email: 'ana@example.com',
    password: 'hashed-secret',
    avatarUrl: 'https://example.com/avatar.png',
    role: 'user',
    active: true,
    mustChangePassword: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  } as unknown as UserDocument;

  it('deve expor role, active e mustChangePassword', () => {
    const result = toPublicUser(user);

    expect(result).toEqual({
      _id: 'user-id',
      name: 'Ana',
      email: 'ana@example.com',
      avatarUrl: 'https://example.com/avatar.png',
      role: 'user',
      active: true,
      mustChangePassword: false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  it('não deve expor password', () => {
    const result = toPublicUser(user);

    expect(result).not.toHaveProperty('password');
  });
});
