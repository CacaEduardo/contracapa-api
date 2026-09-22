import { updateBookSchema } from 'src/modules/books/dto/update-book.dto';

describe('updateBookSchema', () => {
  it('não reintroduz um valor padrão para categorySlugs quando ele é omitido (regressão: .default() sobrevivendo a .partial())', () => {
    const result = updateBookSchema.parse({ title: 'Novo título' });

    expect(result.categorySlugs).toBeUndefined();
    expect('categorySlugs' in result).toBe(false);
  });

  it('mantém categorySlugs quando explicitamente enviado', () => {
    const result = updateBookSchema.parse({ categorySlugs: ['ficcao'] });

    expect(result.categorySlugs).toEqual(['ficcao']);
  });
});
