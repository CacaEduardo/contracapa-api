import { createReviewSchema } from 'src/modules/reviews/dto/create-review.dto';

const BOOK_A = '507f1f77bcf86cd799439011';
const BOOK_B = '507f1f77bcf86cd799439012';
const EXPERT = '507f1f77bcf86cd799439099';

const valid = {
  expertId: EXPERT,
  editorialTitle: 'Título',
  excerpt: 'Resumo',
  content: '<p>Conteúdo</p>',
  indications: [{ editoria: 'market', bookId: BOOK_A }],
};

const messagesOf = (input: unknown) => {
  const result = createReviewSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map(({ message }) => message);
};

describe('createReviewSchema', () => {
  it('exige especialista com mensagem clara', () => {
    expect(messagesOf({ ...valid, expertId: undefined })).toContain(
      'Selecione um especialista',
    );
  });

  it('exige ao menos uma indicação', () => {
    expect(messagesOf({ ...valid, indications: [] })).toContain(
      'Indique ao menos um livro em alguma editoria',
    );
    expect(messagesOf({ ...valid, indications: undefined })).toContain(
      'Indique ao menos um livro em alguma editoria',
    );
  });

  it('rejeita duas indicações na mesma editoria', () => {
    expect(
      messagesOf({
        ...valid,
        indications: [
          { editoria: 'market', bookId: BOOK_A },
          { editoria: 'market', bookId: BOOK_B },
        ],
      }),
    ).toContain('Indique no máximo um livro por editoria');
  });

  it('aceita o mesmo livro em três editorias diferentes', () => {
    const result = createReviewSchema.safeParse({
      ...valid,
      indications: [
        { editoria: 'market', bookId: BOOK_A },
        { editoria: 'off_market', bookId: BOOK_A },
        { editoria: 'do_not_read', bookId: BOOK_A },
      ],
    });

    expect(result.success).toBe(true);
  });
});
