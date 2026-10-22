import { listBooksQuerySchema } from 'src/modules/books/dto/list-books-query.dto';

describe('listBooksQuerySchema', () => {
  it('aceita editoria única repetida como string e converte hasReviews', () => {
    expect(
      listBooksQuerySchema.parse({
        editorias: 'disrecommended',
        hasReviews: 'true',
      }),
    ).toMatchObject({ editorias: ['disrecommended'], hasReviews: true });
  });

  it('rejeita a editoria antiga do_not_read', () => {
    expect(
      listBooksQuerySchema.safeParse({ editorias: 'do_not_read' }).success,
    ).toBe(false);
  });

  it('exige exatamente uma editoria para ordenar por recomendação', () => {
    expect(
      listBooksQuerySchema.safeParse({ sort: 'recomendados' }).success,
    ).toBe(false);
    expect(
      listBooksQuerySchema.safeParse({
        sort: 'recomendados',
        editorias: ['market', 'off_market'],
      }).success,
    ).toBe(false);
    expect(
      listBooksQuerySchema.safeParse({
        sort: 'recomendados',
        editorias: 'market',
      }).success,
    ).toBe(true);
  });
});
