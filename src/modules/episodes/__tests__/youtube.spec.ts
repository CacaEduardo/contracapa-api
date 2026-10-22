import {
  parseYoutubeVideoId,
  youtubeThumbnailUrl,
} from 'src/modules/episodes/youtube';

describe('parseYoutubeVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extrai o id de %s', (url, videoId) => {
    expect(parseYoutubeVideoId(url)).toBe(videoId);
  });

  it.each([
    'não é link',
    'https://vimeo.com/123456',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?v=curto',
    'https://www.youtube.com/@canal',
  ])('rejeita %s', (url) => {
    expect(parseYoutubeVideoId(url)).toBeNull();
  });
});

describe('youtubeThumbnailUrl', () => {
  it('monta a thumb hqdefault do vídeo', () => {
    expect(youtubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });
});
