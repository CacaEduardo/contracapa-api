import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { EpisodesService } from 'src/modules/episodes/episodes.service';
import { Episode } from 'src/modules/episodes/schemas/episode.schema';
import { YoutubeOembedService } from 'src/modules/episodes/youtube-oembed.service';
import { ExpertsService } from 'src/modules/experts/experts.service';

function execOf<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function queryOf<T>(value: T) {
  const query = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.sort.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

const EXPERT_A = '507f1f77bcf86cd799439091';
const EXPERT_B = '507f1f77bcf86cd799439092';
const VIDEO_ID = 'dQw4w9WgXcQ';

describe('EpisodesService', () => {
  let service: EpisodesService;

  const mockEpisodeModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
  };

  const mockExpertsService = {
    findByIds: jest.fn(),
    findBySlugs: jest.fn(),
    setCounter: jest.fn(),
  };

  const mockYoutubeOembedService = { fetch: jest.fn() };

  const expertOf = (id: string, active = true) => ({
    _id: id,
    slug: `expert-${id}`,
    fullName: `Especialista ${id}`,
    active,
  });

  const episode = {
    _id: { toString: () => 'episode-1' },
    videoId: VIDEO_ID,
    youtubeUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    title: 'Market Makers #419',
    channelName: 'Market Makers',
    thumbnailUrl: `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    publishedAt: new Date('2026-10-21'),
    expertIds: [EXPERT_A, EXPERT_B],
    recommendationCount: 0,
    recommenderIds: [] as string[],
  };

  const dto = {
    youtubeUrl: `https://youtu.be/${VIDEO_ID}?si=abc`,
    title: 'Market Makers #419',
    channelName: 'Market Makers',
    publishedAt: new Date('2026-10-21'),
    expertIds: [EXPERT_A, EXPERT_B],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EpisodesService,
        { provide: getModelToken(Episode.name), useValue: mockEpisodeModel },
        { provide: ExpertsService, useValue: mockExpertsService },
        { provide: YoutubeOembedService, useValue: mockYoutubeOembedService },
      ],
    }).compile();

    service = module.get(EpisodesService);
    jest.clearAllMocks();

    mockExpertsService.findByIds.mockImplementation((ids: string[]) =>
      Promise.resolve(ids.map((id) => expertOf(id))),
    );
    mockEpisodeModel.exists.mockReturnValue(execOf(null));
    mockEpisodeModel.countDocuments.mockReturnValue(execOf(1));
  });

  describe('lookup', () => {
    it('devolve thumb, link canônico e dados do oEmbed', async () => {
      mockYoutubeOembedService.fetch.mockResolvedValue({
        title: 'Market Makers #419',
        channelName: 'Market Makers',
      });
      mockEpisodeModel.findOne.mockReturnValue(execOf(null));

      await expect(service.lookup(dto.youtubeUrl)).resolves.toEqual({
        videoId: VIDEO_ID,
        youtubeUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
        title: 'Market Makers #419',
        channelName: 'Market Makers',
        alreadyRegisteredId: null,
      });
    });

    it('mantém a thumb e avisa episódio já cadastrado mesmo sem oEmbed', async () => {
      mockYoutubeOembedService.fetch.mockResolvedValue(null);
      mockEpisodeModel.findOne.mockReturnValue(execOf(episode));

      await expect(service.lookup(dto.youtubeUrl)).resolves.toMatchObject({
        title: null,
        channelName: null,
        thumbnailUrl: `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
        alreadyRegisteredId: 'episode-1',
      });
    });
  });

  describe('create', () => {
    it('deriva videoId, link e thumb do link e conta episódios dos especialistas', async () => {
      mockEpisodeModel.create.mockResolvedValue(episode);
      mockEpisodeModel.countDocuments.mockReturnValue(execOf(2));

      const result = await service.create(dto);

      expect(mockEpisodeModel.create).toHaveBeenCalledWith({
        videoId: VIDEO_ID,
        youtubeUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
        title: dto.title,
        channelName: dto.channelName,
        publishedAt: dto.publishedAt,
        expertIds: dto.expertIds,
      });
      expect(mockExpertsService.setCounter).toHaveBeenCalledWith(
        EXPERT_A,
        'episodeCount',
        2,
      );
      expect(mockExpertsService.setCounter).toHaveBeenCalledWith(
        EXPERT_B,
        'episodeCount',
        2,
      );
      expect(result.experts).toHaveLength(2);
    });

    it('lança 409 quando o vídeo já está cadastrado', async () => {
      mockEpisodeModel.exists.mockReturnValue(execOf({ _id: 'outro' }));

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException('Este episódio já está cadastrado'),
      );
      expect(mockEpisodeModel.create).not.toHaveBeenCalled();
    });

    it('lança 404 quando algum especialista não existe', async () => {
      mockExpertsService.findByIds.mockResolvedValue([expertOf(EXPERT_A)]);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('filtra por especialista e omite convidados inativos na leitura pública', async () => {
      const query = queryOf([episode]);
      mockEpisodeModel.find.mockReturnValue(query);
      mockExpertsService.findBySlugs.mockResolvedValue([
        { _id: { toString: () => EXPERT_A } },
      ]);
      mockExpertsService.findByIds.mockResolvedValue([
        expertOf(EXPERT_A),
        expertOf(EXPERT_B, false),
      ]);

      const { items } = await service.findAll({
        experts: ['expert-a'],
        page: 1,
        pageSize: 12,
      });

      expect(mockEpisodeModel.find).toHaveBeenCalledWith({
        expertIds: { $in: [EXPERT_A] },
      });
      expect(query.sort).toHaveBeenCalledWith({
        publishedAt: -1,
        createdAt: -1,
      });
      expect(items[0].experts.map(({ _id }) => _id)).toEqual([EXPERT_A]);
    });

    it('mantém convidados inativos na leitura do admin', async () => {
      mockEpisodeModel.find.mockReturnValue(queryOf([episode]));
      mockExpertsService.findByIds.mockResolvedValue([
        expertOf(EXPERT_A),
        expertOf(EXPERT_B, false),
      ]);

      const { items } = await service.findAllAdmin({ page: 1, pageSize: 12 });

      expect(items[0].experts).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('recalcula thumb ao trocar o link', async () => {
      const NEW_ID = 'abcdefghijk';
      mockEpisodeModel.findById.mockReturnValue(execOf(episode));
      mockEpisodeModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...episode, videoId: NEW_ID }),
      );

      await service.update('episode-1', {
        youtubeUrl: `https://youtu.be/${NEW_ID}`,
      });

      expect(mockEpisodeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'episode-1',
        {
          videoId: NEW_ID,
          youtubeUrl: `https://www.youtube.com/watch?v=${NEW_ID}`,
          thumbnailUrl: `https://i.ytimg.com/vi/${NEW_ID}/hqdefault.jpg`,
        },
        { new: true },
      );
    });

    it('lança 409 ao tirar do episódio quem tem recomendações nele', async () => {
      mockEpisodeModel.findById.mockReturnValue(
        execOf({ ...episode, recommenderIds: [EXPERT_B] }),
      );

      await expect(
        service.update('episode-1', { expertIds: [EXPERT_A] }),
      ).rejects.toThrow(ConflictException);
      expect(mockEpisodeModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('recalcula episódios de quem saiu e de quem entrou', async () => {
      const EXPERT_C = '507f1f77bcf86cd799439093';
      mockEpisodeModel.findById.mockReturnValue(execOf(episode));
      mockEpisodeModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...episode, expertIds: [EXPERT_A, EXPERT_C] }),
      );

      await service.update('episode-1', { expertIds: [EXPERT_A, EXPERT_C] });

      expect(
        mockExpertsService.setCounter.mock.calls
          .map(([id]) => id as string)
          .sort(),
      ).toEqual([EXPERT_A, EXPERT_B, EXPERT_C].sort());
    });
  });

  describe('remove', () => {
    it('lança 409 quando o episódio tem recomendações', async () => {
      mockEpisodeModel.findById.mockReturnValue(
        execOf({ ...episode, recommendationCount: 2 }),
      );

      await expect(service.remove('episode-1')).rejects.toThrow(
        new ConflictException(
          'Este episódio tem recomendações. Remova-as antes de excluí-lo.',
        ),
      );
      expect(mockEpisodeModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('exclui e recalcula os especialistas', async () => {
      mockEpisodeModel.findById.mockReturnValue(execOf(episode));
      mockEpisodeModel.findByIdAndDelete.mockReturnValue(execOf(episode));
      mockEpisodeModel.countDocuments.mockReturnValue(execOf(0));

      await service.remove('episode-1');

      expect(mockExpertsService.setCounter).toHaveBeenCalledWith(
        EXPERT_A,
        'episodeCount',
        0,
      );
    });

    it('lança 404 quando não existe', async () => {
      mockEpisodeModel.findById.mockReturnValue(execOf(null));

      await expect(service.remove('nada')).rejects.toThrow(NotFoundException);
    });
  });
});
