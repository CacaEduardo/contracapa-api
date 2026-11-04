export const AMAZON_ASSOCIATE_TAG = 'biblioteca099-20';
export const AMAZON_PRODUCT_URL_MESSAGE =
  'Cole o link da página do produto na Amazon. O endereço precisa ter /dp/.';

const AMAZON_HOSTS = new Set(['amazon.com.br', 'www.amazon.com.br']);
const ASIN_IN_PATH = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?=\/|$)/i;

const extractAmazonAsin = (value: string): string | null => {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (!AMAZON_HOSTS.has(parsed.hostname.toLowerCase())) {
    return null;
  }

  const match = parsed.pathname.match(ASIN_IN_PATH);
  const asin = match?.[1];

  return asin ? asin.toUpperCase() : null;
};

export const toAmazonAffiliateUrl = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const asin = extractAmazonAsin(trimmed);

  if (!asin) {
    return null;
  }

  return `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_ASSOCIATE_TAG}`;
};
