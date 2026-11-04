import {
  AMAZON_ASSOCIATE_TAG,
  toAmazonAffiliateUrl,
} from 'src/modules/books/amazon-link';

const AFFILIATE_URL = `https://www.amazon.com.br/dp/8551008889?tag=${AMAZON_ASSOCIATE_TAG}`;
const PERCY_JACKSON_URL =
  'https://www.amazon.com.br/Box-Percy-Jackson-olimpianos-edicao/dp/8551008889/ref=sr_1_1?keywords=percy+jackson+amazon&qid=1793819560&sr=8-1';

describe('toAmazonAffiliateUrl', () => {
  it('extrai o ASIN do link longo do produto e monta o link de associado', () => {
    expect(toAmazonAffiliateUrl(PERCY_JACKSON_URL)).toBe(AFFILIATE_URL);
  });

  it('mantém o padrão quando a URL já tem a tag', () => {
    expect(toAmazonAffiliateUrl(AFFILIATE_URL)).toBe(AFFILIATE_URL);
  });

  it('aceita /gp/product/ e amazon.com.br sem www', () => {
    expect(
      toAmazonAffiliateUrl('https://amazon.com.br/gp/product/8551008889'),
    ).toBe(AFFILIATE_URL);
  });

  it('aceita /gp/aw/d/', () => {
    expect(
      toAmazonAffiliateUrl('https://www.amazon.com.br/gp/aw/d/B0F2S5XJ7K'),
    ).toBe(
      `https://www.amazon.com.br/dp/B0F2S5XJ7K?tag=${AMAZON_ASSOCIATE_TAG}`,
    );
  });

  it('devolve null quando não há /dp/ de produto', () => {
    expect(
      toAmazonAffiliateUrl('https://www.amazon.com.br/s?k=percy+jackson'),
    ).toBeNull();
  });

  it('devolve null para vazio, encurtador e outro domínio', () => {
    expect(toAmazonAffiliateUrl('')).toBeNull();
    expect(toAmazonAffiliateUrl('   ')).toBeNull();
    expect(toAmazonAffiliateUrl('https://amzn.to/abc123')).toBeNull();
    expect(
      toAmazonAffiliateUrl('https://www.amazon.com/dp/8551008889'),
    ).toBeNull();
  });
});
