import { AMAZON_PRODUCT_URL_MESSAGE } from 'src/modules/books/amazon-link';
import { createBookSchema } from 'src/modules/books/dto/create-book.dto';

const book = {
  title: 'Percy Jackson',
  author: 'Rick Riordan',
  year: 2014,
  pages: 400,
};

describe('createBookSchema amazonUrl', () => {
  it('converte o link do produto no link de associado', () => {
    const result = createBookSchema.parse({
      ...book,
      amazonUrl:
        'https://www.amazon.com.br/dp/8551008889/ref=sr_1_1?keywords=percy',
    });

    expect(result.amazonUrl).toBe(
      'https://www.amazon.com.br/dp/8551008889?tag=biblioteca099-20',
    );
  });

  it('aceita null e omite o campo quando ele não vem', () => {
    expect(createBookSchema.parse({ ...book, amazonUrl: null }).amazonUrl).toBe(
      null,
    );
    expect('amazonUrl' in createBookSchema.parse(book)).toBe(false);
  });

  it('rejeita URL que não é página de produto', () => {
    const result = createBookSchema.safeParse({
      ...book,
      amazonUrl: 'https://www.amazon.com.br/s?k=percy+jackson',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map(({ message }) => message)).toContain(
      AMAZON_PRODUCT_URL_MESSAGE,
    );
  });
});
