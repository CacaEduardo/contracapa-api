import { listRecommendationsQuerySchema } from 'src/modules/recommendations/dto/list-recommendations-query.dto';

describe('listRecommendationsQuerySchema', () => {
  it('exige ao menos um filtro', () => {
    const result = listRecommendationsQuerySchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Filtre por especialista, episódio ou livro',
    );
  });

  it('aceita episódio único como string', () => {
    expect(
      listRecommendationsQuerySchema.parse({
        episodes: '507f1f77bcf86cd799439081',
      }),
    ).toEqual({ episodes: ['507f1f77bcf86cd799439081'] });
  });
});
