import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from 'src/modules/books/books.service';
import { EpisodesService } from 'src/modules/episodes/episodes.service';
import { ExpertsService } from 'src/modules/experts/experts.service';
import { RecommendationsService } from 'src/modules/recommendations/recommendations.service';
import { Recommendation } from 'src/modules/recommendations/schemas/recommendation.schema';

function execOf<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function queryOf<T>(value: T) {
  const query = {
    sort: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.sort.mockReturnValue(query);
  return query;
}

const EPISODE = '507f1f77bcf86cd799439081';
const EXPERT = '507f1f77bcf86cd799439091';
const GUEST = '507f1f77bcf86cd799439092';
const BOOK_A = '507f1f77bcf86cd799439011';
const BOOK_B = '507f1f77bcf86cd799439012';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  const mockRecommendationModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
  };

  const mockBooksService = {
    findById: jest.fn(),
    findByIds: jest.fn(),
    setRecommendationSnapshot: jest.fn(),
  };

  const mockExpertsService = {
    findByIds: jest.fn(),
    findBySlugs: jest.fn(),
    setCounter: jest.fn(),
  };

  const mockEpisodesService = {
    findById: jest.fn(),
    findSummariesByIds: jest.fn(),
    setRecommendationSnapshot: jest.fn(),
  };

  const recommendationOf = (
    overrides: Partial<{
      bookId: string;
      editoria: 'market' | 'off_market' | 'disrecommended';
      createdAt: Date;
    }> = {},
  ) => ({
    _id: { toString: () => 'rec-1' },
    episodeId: EPISODE,
    expertId: EXPERT,
    bookId: BOOK_A,
    editoria: 'market' as const,
    createdAt: new Date('2026-10-01'),
    ...overrides,
  });

  const dto = {
    episodeId: EPISODE,
    expertId: EXPERT,
    bookId: BOOK_A,
    editoria: 'market' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: getModelToken(Recommendation.name),
          useValue: mockRecommendationModel,
        },
        { provide: BooksService, useValue: mockBooksService },
        { provide: ExpertsService, useValue: mockExpertsService },
        { provide: EpisodesService, useValue: mockEpisodesService },
      ],
    }).compile();

    service = module.get(RecommendationsService);
    jest.clearAllMocks();

    mockEpisodesService.findById.mockResolvedValue({
      expertIds: [EXPERT, GUEST],
    });
    mockEpisodesService.findSummariesByIds.mockResolvedValue([
      { _id: EPISODE, title: 'Market Makers #419' },
    ]);
    mockBooksService.findById.mockResolvedValue({ _id: BOOK_A });
    mockBooksService.findByIds.mockImplementation((ids: string[]) =>
      Promise.resolve(
        ids.map((id) => ({
          _id: id,
          slug: `livro-${id}`,
          title: 'Livro',
          author: 'Autor',
          coverSrc: null,
          active: true,
        })),
      ),
    );
    mockExpertsService.findByIds.mockResolvedValue([
      { _id: EXPERT, slug: 'ana-souza', active: true },
    ]);
    mockRecommendationModel.exists.mockReturnValue(execOf(null));
    mockRecommendationModel.countDocuments.mockReturnValue(execOf(1));
    mockRecommendationModel.find.mockReturnValue(queryOf([recommendationOf()]));
  });

  describe('create', () => {
    it('cria e devolve com episódio, especialista e livro resolvidos', async () => {
      mockRecommendationModel.create.mockResolvedValue(recommendationOf());

      const result = await service.create(dto);

      expect(mockRecommendationModel.create).toHaveBeenCalledWith(dto);
      expect(result).toMatchObject({
        editoria: 'market',
        episode: { _id: EPISODE },
        expert: { slug: 'ana-souza' },
        book: { _id: BOOK_A, active: true },
      });
    });

    it('lança 400 quando o especialista não participou do episódio', async () => {
      mockEpisodesService.findById.mockResolvedValue({ expertIds: [GUEST] });

      await expect(service.create(dto)).rejects.toThrow(
        new BadRequestException('Este especialista não participou do episódio'),
      );
      expect(mockRecommendationModel.create).not.toHaveBeenCalled();
    });

    it('lança 404 quando o episódio ou o livro não existe', async () => {
      mockBooksService.findById.mockRejectedValue(
        new NotFoundException('Livro não encontrado'),
      );

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('lança 409 quando o mesmo livro já foi recomendado pelo especialista no episódio', async () => {
      mockRecommendationModel.exists.mockReturnValue(execOf({ _id: 'outra' }));

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException(
          'Este especialista já recomendou este livro neste episódio',
        ),
      );
      expect(mockRecommendationModel.exists).toHaveBeenCalledWith({
        episodeId: EPISODE,
        expertId: EXPERT,
        bookId: BOOK_A,
      });
    });

    it('recalcula snapshots do livro, do especialista e do episódio', async () => {
      mockRecommendationModel.create.mockResolvedValue(recommendationOf());
      mockRecommendationModel.find.mockReturnValue(
        queryOf([
          recommendationOf({ createdAt: new Date('2026-09-01') }),
          recommendationOf({ createdAt: new Date('2026-10-01') }),
          recommendationOf({
            editoria: 'disrecommended',
            createdAt: new Date('2026-08-01'),
          }),
        ]),
      );
      mockRecommendationModel.countDocuments.mockReturnValue(execOf(7));

      await service.create(dto);

      expect(mockBooksService.setRecommendationSnapshot).toHaveBeenCalledWith(
        BOOK_A,
        {
          editorias: ['market', 'disrecommended'],
          recommenderSlugs: ['ana-souza'],
          recommendationCount: 2,
          disrecommendationCount: 1,
          recommendedAt: {
            market: new Date('2026-10-01'),
            disrecommended: new Date('2026-08-01'),
          },
        },
      );
      expect(mockExpertsService.setCounter).toHaveBeenCalledWith(
        EXPERT,
        'recommendationCount',
        7,
      );
      expect(
        mockEpisodesService.setRecommendationSnapshot,
      ).toHaveBeenCalledWith(EPISODE, {
        recommendationCount: 3,
        recommenderIds: [EXPERT],
      });
    });
  });

  describe('findAll', () => {
    it('filtra por especialista, episódio e livro, mais recentes primeiro', async () => {
      const query = queryOf([recommendationOf()]);
      mockRecommendationModel.find.mockReturnValue(query);
      mockExpertsService.findBySlugs.mockResolvedValue([
        { _id: { toString: () => EXPERT } },
      ]);

      await service.findAll({
        experts: ['ana-souza'],
        episodes: [EPISODE],
        book: BOOK_A,
      });

      expect(mockRecommendationModel.find).toHaveBeenCalledWith({
        expertId: { $in: [EXPERT] },
        episodeId: { $in: [EPISODE] },
        bookId: BOOK_A,
      });
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('update', () => {
    it('troca o tipo sem revalidar o alvo', async () => {
      mockRecommendationModel.findById.mockReturnValue(
        execOf(recommendationOf()),
      );
      mockRecommendationModel.findByIdAndUpdate.mockReturnValue(
        execOf(recommendationOf({ editoria: 'off_market' })),
      );

      await service.update('rec-1', { editoria: 'off_market' });

      expect(mockEpisodesService.findById).not.toHaveBeenCalled();
      expect(mockRecommendationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'rec-1',
        {
          episodeId: EPISODE,
          expertId: EXPERT,
          bookId: BOOK_A,
          editoria: 'off_market',
        },
        { new: true },
      );
    });

    it('revalida e recalcula o livro antigo e o novo ao trocar o livro', async () => {
      mockRecommendationModel.findById.mockReturnValue(
        execOf(recommendationOf()),
      );
      mockRecommendationModel.findByIdAndUpdate.mockReturnValue(
        execOf(recommendationOf({ bookId: BOOK_B })),
      );

      await service.update('rec-1', { bookId: BOOK_B });

      expect(mockRecommendationModel.exists).toHaveBeenCalledWith({
        episodeId: EPISODE,
        expertId: EXPERT,
        bookId: BOOK_B,
      });
      expect(
        mockBooksService.setRecommendationSnapshot.mock.calls.map(
          ([id]) => id as string,
        ),
      ).toEqual([BOOK_A, BOOK_B]);
    });

    it('lança 404 quando não existe', async () => {
      mockRecommendationModel.findById.mockReturnValue(execOf(null));

      await expect(
        service.update('nada', { editoria: 'market' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('exclui e zera os snapshots', async () => {
      mockRecommendationModel.findById.mockReturnValue(
        execOf(recommendationOf()),
      );
      mockRecommendationModel.findByIdAndDelete.mockReturnValue(
        execOf(recommendationOf()),
      );
      mockRecommendationModel.find.mockReturnValue(queryOf([]));
      mockRecommendationModel.countDocuments.mockReturnValue(execOf(0));
      mockExpertsService.findByIds.mockResolvedValue([]);

      await service.remove('rec-1');

      expect(mockBooksService.setRecommendationSnapshot).toHaveBeenCalledWith(
        BOOK_A,
        {
          editorias: [],
          recommenderSlugs: [],
          recommendationCount: 0,
          disrecommendationCount: 0,
          recommendedAt: {},
        },
      );
      expect(
        mockEpisodesService.setRecommendationSnapshot,
      ).toHaveBeenCalledWith(EPISODE, {
        recommendationCount: 0,
        recommenderIds: [],
      });
    });
  });
});
