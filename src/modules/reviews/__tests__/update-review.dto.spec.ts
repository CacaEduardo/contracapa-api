import { updateReviewSchema } from 'src/modules/reviews/dto/update-review.dto';

describe('updateReviewSchema', () => {
  it('não reintroduz valores padrão para weekly e podcast quando omitidos (regressão: .default() sobrevivendo a .partial())', () => {
    const result = updateReviewSchema.parse({ excerpt: 'Novo resumo' });

    expect(result.weekly).toBeUndefined();
    expect('weekly' in result).toBe(false);
    expect(result.podcast).toBeUndefined();
    expect('podcast' in result).toBe(false);
  });

  it('mantém weekly e podcast quando explicitamente enviados', () => {
    const result = updateReviewSchema.parse({
      weekly: true,
      podcast: { spotify: 'https://open.spotify.com' },
    });

    expect(result.weekly).toBe(true);
    expect(result.podcast).toEqual({ spotify: 'https://open.spotify.com' });
  });
});
