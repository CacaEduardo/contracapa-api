import { createExpertSchema } from 'src/modules/experts/dto/create-expert.dto';
import { updateExpertSchema } from 'src/modules/experts/dto/update-expert.dto';

describe('createExpertSchema', () => {
  const valid = {
    fullName: '  Ana Souza ',
    email: ' Ana@Exemplo.com ',
  };

  it('normaliza nome e e-mail', () => {
    const result = createExpertSchema.parse(valid);

    expect(result.fullName).toBe('Ana Souza');
    expect(result.email).toBe('ana@exemplo.com');
  });

  it('converte textos opcionais vazios em null', () => {
    const result = createExpertSchema.parse({
      ...valid,
      company: '   ',
      phone: '',
    });

    expect(result.company).toBeNull();
    expect(result.phone).toBeNull();
  });

  it('rejeita e-mail inválido', () => {
    expect(
      createExpertSchema.safeParse({ ...valid, email: 'ana' }).success,
    ).toBe(false);
  });

  it('rejeita nome ausente', () => {
    expect(
      createExpertSchema.safeParse({ ...valid, fullName: '  ' }).success,
    ).toBe(false);
  });

  it('rejeita URL de podcast inválida', () => {
    expect(
      createExpertSchema.safeParse({ ...valid, podcastUrl: 'podcast' }).success,
    ).toBe(false);
  });

  it('aceita redes conhecidas e rejeita rede desconhecida ou URL inválida', () => {
    expect(
      createExpertSchema.safeParse({
        ...valid,
        socialLinks: [
          { network: 'instagram', url: 'https://instagram.com/ana' },
        ],
      }).success,
    ).toBe(true);
    expect(
      createExpertSchema.safeParse({
        ...valid,
        socialLinks: [{ network: 'orkut', url: 'https://orkut.com/ana' }],
      }).success,
    ).toBe(false);
    expect(
      createExpertSchema.safeParse({
        ...valid,
        socialLinks: [{ network: 'linkedin', url: 'ana' }],
      }).success,
    ).toBe(false);
  });
});

describe('updateExpertSchema', () => {
  it('não inclui campos omitidos', () => {
    const result = updateExpertSchema.parse({ company: 'Editora X' });

    expect(result).toEqual({ company: 'Editora X' });
  });
});
