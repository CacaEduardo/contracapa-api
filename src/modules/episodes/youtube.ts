const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com'];
const PATH_PREFIXES = ['/live/', '/shorts/', '/embed/'];

// Aceita youtube.com/watch?v=, youtu.be/, /live/, /shorts/ e /embed/; devolve null para o resto.
export function parseYoutubeVideoId(url: string): string | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  let candidate: string | null = null;

  if (parsed.hostname === 'youtu.be') {
    candidate = parsed.pathname.slice(1);
  } else if (YOUTUBE_HOSTS.includes(parsed.hostname)) {
    const prefix = PATH_PREFIXES.find((value) =>
      parsed.pathname.startsWith(value),
    );
    candidate = prefix
      ? parsed.pathname.slice(prefix.length).split('/')[0]
      : parsed.pathname === '/watch'
        ? parsed.searchParams.get('v')
        : null;
  }

  return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

export const youtubeWatchUrl = (videoId: string): string =>
  `https://www.youtube.com/watch?v=${videoId}`;

export const youtubeThumbnailUrl = (videoId: string): string =>
  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
