import { createEpisodeSchema } from 'src/modules/episodes/dto/create-episode.dto';

const EXPERT = '507f1f77bcf86cd799439099';

const valid = {
  youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
  title: 'Market Makers #419',
  channelName: 'Market Makers',
  publishedAt: '2026-10-21',
  expertIds: [EXPERT],
};

const messagesOf = (input: unknown) => {
  const result = createEpisodeSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map(({ message }) => message);
};

describe('createEpisodeSchema', () => {
  it('aceita episódio válido e converte a data', () => {
    const result = createEpisodeSchema.parse(valid);

    expect(result.publishedAt).toEqual(new Date('2026-10-21'));
  });

  it('rejeita link que não é do YouTube', () => {
    expect(
      messagesOf({ ...valid, youtubeUrl: 'https://vimeo.com/1' }),
    ).toContain('Informe um link válido do YouTube');
  });

  it('exige ao menos um especialista, sem repetição', () => {
    expect(messagesOf({ ...valid, expertIds: [] })).toContain(
      'Selecione ao menos um especialista',
    );
    expect(messagesOf({ ...valid, expertIds: [EXPERT, EXPERT] })).toContain(
      'Especialista repetido no episódio',
    );
  });

  it('exige título, podcast e data', () => {
    expect(
      messagesOf({ ...valid, title: ' ', channelName: '', publishedAt: 'x' }),
    ).toEqual(
      expect.arrayContaining([
        'Informe o título do episódio',
        'Informe o nome do podcast',
        'Informe a data do episódio',
      ]),
    );
  });
});
