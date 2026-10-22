import { Injectable, Logger } from '@nestjs/common';
import { youtubeWatchUrl } from 'src/modules/episodes/youtube';

export type YoutubeOembed = {
  title: string;
  channelName: string;
};

type OembedPayload = {
  title?: unknown;
  author_name?: unknown;
};

const OEMBED_ENDPOINT = 'https://www.youtube.com/oembed';
const TIMEOUT_MS = 5000;

// oEmbed público do YouTube: título e canal do vídeo sem chave de API.
@Injectable()
export class YoutubeOembedService {
  private readonly logger = new Logger(YoutubeOembedService.name);

  async fetch(videoId: string): Promise<YoutubeOembed | null> {
    const url = `${OEMBED_ENDPOINT}?format=json&url=${encodeURIComponent(youtubeWatchUrl(videoId))}`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(
          `oEmbed do YouTube respondeu ${response.status}: videoId=${videoId}`,
        );
        return null;
      }

      const payload = (await response.json()) as OembedPayload;

      if (
        typeof payload.title !== 'string' ||
        typeof payload.author_name !== 'string'
      ) {
        return null;
      }

      return { title: payload.title, channelName: payload.author_name };
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar oEmbed do YouTube: videoId=${videoId} ${String(error)}`,
      );
      return null;
    }
  }
}
