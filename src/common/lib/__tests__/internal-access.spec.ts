import {
  isOriginAllowed,
  parseAllowedOrigins,
  resolveRequestOrigin,
  internalTokensMatch,
} from 'src/common/lib/internal-access';

describe('internal-access', () => {
  it('separa origens por vírgula e ignora vazios', () => {
    expect(
      parseAllowedOrigins(' http://localhost:3000, ,https://carla.example '),
    ).toEqual(['http://localhost:3000', 'https://carla.example']);
  });

  it('aceita origem exata e hostname cadastrado', () => {
    const allowed = ['http://localhost:3000', 'carla.example'];

    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
    expect(isOriginAllowed('https://localhost:3000', allowed)).toBe(false);
    expect(isOriginAllowed('https://carla.example', allowed)).toBe(true);
    expect(isOriginAllowed('https://evil.example', allowed)).toBe(false);
  });

  it('extrai origin do Referer quando Origin não veio', () => {
    expect(resolveRequestOrigin(undefined, 'http://localhost:3000/admin')).toBe(
      'http://localhost:3000',
    );
  });

  it('compara tokens em tempo constante e rejeita ausente', () => {
    expect(internalTokensMatch('abc', 'abc')).toBe(true);
    expect(internalTokensMatch('abc', 'abd')).toBe(false);
    expect(internalTokensMatch(undefined, 'abc')).toBe(false);
  });
});
