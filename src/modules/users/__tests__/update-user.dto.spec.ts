import { updateUserSchema } from 'src/modules/users/dto/update-user.dto';

describe('updateUserSchema', () => {
  it('não reintroduz um valor padrão para role quando ele é omitido (regressão: .default() sobrevivendo a .partial())', () => {
    const result = updateUserSchema.parse({ name: 'Novo nome' });

    expect(result.role).toBeUndefined();
    expect('role' in result).toBe(false);
  });

  it('mantém o role quando explicitamente enviado', () => {
    const result = updateUserSchema.parse({ role: 'admin' });

    expect(result.role).toBe('admin');
  });
});
