import { createReviewSchema } from 'src/modules/reviews/dto/create-review.dto';

const BOOK = '507f1f77bcf86cd799439011';
const EXPERT = '507f1f77bcf86cd799439099';

const valid = {
  expertId: EXPERT,
  bookId: BOOK,
  editorialTitle: 'Título',
  excerpt: 'Resumo',
  content: '<p>Conteúdo</p>',
};

const messagesOf = (input: unknown) => {
  const result = createReviewSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map(({ message }) => message);
};

describe('createReviewSchema', () => {
  it('aceita resenha de um especialista sobre um livro', () => {
    expect(createReviewSchema.safeParse(valid).success).toBe(true);
  });

  it('exige especialista com mensagem clara', () => {
    expect(messagesOf({ ...valid, expertId: undefined })).toContain(
      'Selecione um especialista',
    );
  });

  it('exige o livro resenhado com mensagem clara', () => {
    expect(messagesOf({ ...valid, bookId: undefined })).toContain(
      'Selecione o livro resenhado',
    );
    expect(messagesOf({ ...valid, bookId: 'livro' })).toContain(
      'Selecione o livro resenhado',
    );
  });

  it('descarta campos do modelo antigo (indicações e podcast)', () => {
    const result = createReviewSchema.parse({
      ...valid,
      indications: [{ editoria: 'market', bookId: BOOK }],
      podcast: { youtube: 'https://youtube.com' },
    });

    expect(result).not.toHaveProperty('indications');
    expect(result).not.toHaveProperty('podcast');
  });
});
