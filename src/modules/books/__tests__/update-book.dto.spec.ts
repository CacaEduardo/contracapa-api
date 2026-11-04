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

  it('aceita inativar e reativar o livro', () => {
    expect(updateBookSchema.parse({ active: false })).toEqual({
      active: false,
    });
  });

  it('converte descrição vazia em null', () => {
    expect(updateBookSchema.parse({ description: '  ' }).description).toBe(
      null,
    );
  });

  it('não zera amazonUrl quando o campo é omitido', () => {
    const result = updateBookSchema.parse({ title: 'Novo título' });

    expect(result.amazonUrl).toBeUndefined();
    expect('amazonUrl' in result).toBe(false);
  });

  it('converte amazonUrl enviado para o link de associado', () => {
    expect(
      updateBookSchema.parse({
        amazonUrl: 'https://www.amazon.com.br/gp/product/8551008889',
      }).amazonUrl,
    ).toBe('https://www.amazon.com.br/dp/8551008889?tag=biblioteca099-20');
  });
});
