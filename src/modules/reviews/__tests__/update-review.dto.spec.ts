import { updateReviewSchema } from 'src/modules/reviews/dto/update-review.dto';

describe('updateReviewSchema', () => {
  it('não reintroduz valor padrão para weekly quando omitido (regressão: .default() sobrevivendo a .partial())', () => {
    const result = updateReviewSchema.parse({ excerpt: 'Novo resumo' });

    expect(result.weekly).toBeUndefined();
    expect('weekly' in result).toBe(false);
  });

  it('mantém weekly quando explicitamente enviado', () => {
    expect(updateReviewSchema.parse({ weekly: true }).weekly).toBe(true);
  });

  it('continua validando o livro quando enviado', () => {
    expect(updateReviewSchema.safeParse({ bookId: 'livro' }).success).toBe(
      false,
    );
  });
});
