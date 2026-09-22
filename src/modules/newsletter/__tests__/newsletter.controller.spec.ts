import { Test, TestingModule } from '@nestjs/testing';
import { NewsletterController } from 'src/modules/newsletter/newsletter.controller';
import { NewsletterService } from 'src/modules/newsletter/newsletter.service';

describe('NewsletterController', () => {
  let controller: NewsletterController;

  const mockNewsletterService = {
    subscribe: jest.fn(),
    confirm: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [
        { provide: NewsletterService, useValue: mockNewsletterService },
      ],
    }).compile();

    controller = module.get(NewsletterController);
    jest.clearAllMocks();
  });

  it('deve assinar a newsletter via service', async () => {
    const dto = {
      name: 'Ana',
      email: 'ana@example.com',
      consent: true as const,
    };
    const created = { _id: '1', ...dto, status: 'pending' as const };
    mockNewsletterService.subscribe.mockResolvedValue(created);

    await expect(controller.subscribe(dto)).resolves.toEqual(created);
  });

  it('deve confirmar assinatura via service', async () => {
    mockNewsletterService.confirm.mockResolvedValue(undefined);

    await expect(controller.confirm({ token: 'abc' })).resolves.toEqual({
      confirmed: true,
    });
    expect(mockNewsletterService.confirm).toHaveBeenCalledWith({
      token: 'abc',
    });
  });

  it('deve listar assinantes via service', async () => {
    mockNewsletterService.findAll.mockResolvedValue([]);

    await expect(controller.findAll({})).resolves.toEqual([]);
  });
});
