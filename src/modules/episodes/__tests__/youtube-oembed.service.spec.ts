import { Logger } from '@nestjs/common';
import { YoutubeOembedService } from 'src/modules/episodes/youtube-oembed.service';

describe('YoutubeOembedService', () => {
  const service = new YoutubeOembedService();
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  it('devolve título e canal do vídeo', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: 'Market Makers #419',
          author_name: 'Market Makers',
        }),
    });

    await expect(service.fetch('dQw4w9WgXcQ')).resolves.toEqual({
      title: 'Market Makers #419',
      channelName: 'Market Makers',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ',
      expect.anything(),
    );
  });

  it('devolve null quando o YouTube responde erro', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(service.fetch('dQw4w9WgXcQ')).resolves.toBeNull();
  });

  it('devolve null quando a requisição falha', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));

    await expect(service.fetch('dQw4w9WgXcQ')).resolves.toBeNull();
  });
});
