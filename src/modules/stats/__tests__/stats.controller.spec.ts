import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from 'src/modules/stats/stats.controller';
import { StatsService } from 'src/modules/stats/stats.service';

describe('StatsController', () => {
  let controller: StatsController;

  const mockStatsService = { getStats: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [{ provide: StatsService, useValue: mockStatsService }],
    }).compile();

    controller = module.get(StatsController);
    jest.clearAllMocks();
  });

  it('deve devolver as estatísticas via service', async () => {
    const stats = { books: 8, categories: 5, reviews: 6, subscribers: 3 };
    mockStatsService.getStats.mockResolvedValue(stats);

    await expect(controller.getStats()).resolves.toEqual(stats);
  });
});
