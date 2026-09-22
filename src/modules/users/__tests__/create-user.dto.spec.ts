import { createUserSchema } from 'src/modules/users/dto/create-user.dto';

describe('createUserSchema', () => {
  it('sem role deixa o campo indefinido (default fica a cargo do service, não do schema)', () => {
    const result = createUserSchema.parse({
      name: 'Ana',
      email: 'ana@example.com',
    });

    expect(result.role).toBeUndefined();
  });

  it('rejeita role fora do enum', () => {
    expect(() =>
      createUserSchema.parse({
        name: 'Ana',
        email: 'ana@example.com',
        role: 'guest',
      }),
    ).toThrow();
  });

  it('aceita phone opcional', () => {
    const result = createUserSchema.parse({
      name: 'Ana',
      email: 'ana@example.com',
      phone: '11999999999',
    });

    expect(result.phone).toBe('11999999999');
  });
});
