import { createHash, timingSafeEqual } from 'node:crypto';

export const INTERNAL_TOKEN_HEADER = 'x-internal-token';

export const parseAllowedOrigins = (raw?: string): string[] =>
  (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const originFromReferer = (referer?: string): string | undefined => {
  if (!referer) {
    return undefined;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
};

export const resolveRequestOrigin = (
  originHeader?: string,
  refererHeader?: string,
): string | undefined => originHeader || originFromReferer(refererHeader);

const matchesAllowedEntry = (requestOrigin: URL, entry: string): boolean => {
  if (entry.includes('://')) {
    try {
      return requestOrigin.origin === new URL(entry).origin;
    } catch {
      return false;
    }
  }

  return requestOrigin.host === entry || requestOrigin.hostname === entry;
};

export const isOriginAllowed = (
  origin: string | undefined,
  allowedOrigins: string[],
): boolean => {
  if (!origin || allowedOrigins.length === 0) {
    return false;
  }

  try {
    const requestOrigin = new URL(origin);
    return allowedOrigins.some((entry) =>
      matchesAllowedEntry(requestOrigin, entry),
    );
  } catch {
    return false;
  }
};

export const internalTokensMatch = (
  provided: string | undefined,
  expected: string,
): boolean => {
  if (!provided) {
    return false;
  }

  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();

  return timingSafeEqual(providedHash, expectedHash);
};
