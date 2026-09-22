import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { envSchema } from 'src/config/env.schema';

function parseEnvExample(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    result[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }

  return result;
}

describe('.env.example da API', () => {
  const parsed = parseEnvExample(
    readFileSync(join(process.cwd(), '.env.example'), 'utf8'),
  );

  it('declara as variáveis do seed vazias', () => {
    expect(parsed.SEED_ADMIN_NAME).toBe('');
    expect(parsed.SEED_ADMIN_EMAIL).toBe('');
    expect(parsed.SEED_ADMIN_PASSWORD).toBe('');
  });

  it('mantém segredos de conexão vazios', () => {
    expect(parsed.MONGO_URL).toBe('');
    expect(parsed.JWT_SECRET).toBe('');
    expect(parsed.INTERNAL_TOKEN).toBe('');
    expect(parsed.ALLOWED_ORIGINS).toBe('');
  });

  it('alinha as chaves do exemplo ao schema de env', () => {
    expect(Object.keys(parsed).sort()).toEqual(
      Object.keys(envSchema.shape).sort(),
    );
  });
});
