import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ResendMailProvider } from 'src/modules/mail/providers/resend-mail.provider';

const sendMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

describe('ResendMailProvider', () => {
  function buildProvider(values: Record<string, string | undefined>) {
    return Test.createTestingModule({
      providers: [
        ResendMailProvider,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => values[key] },
        },
      ],
    }).compile();
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve enviar e-mail via Resend com from configurado', async () => {
    const module: TestingModule = await buildProvider({
      RESEND_API_KEY: 're_test_key',
      MAIL_FROM_EMAIL: 'contato@contracapa.com',
      MAIL_FROM_NAME: 'Contracapa',
    });
    const provider = module.get(ResendMailProvider);
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });

    await provider.send({
      to: 'leitor@example.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    });

    expect(sendMock).toHaveBeenCalledWith({
      from: 'Contracapa <contato@contracapa.com>',
      to: 'leitor@example.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    });
  });

  it('deve usar remetente padrão quando MAIL_FROM_* não estiver configurado', async () => {
    const module: TestingModule = await buildProvider({
      RESEND_API_KEY: 're_test_key',
    });
    const provider = module.get(ResendMailProvider);
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });

    await provider.send({
      to: 'leitor@example.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Contracapa <onboarding@resend.dev>',
      }),
    );
  });

  it('não deve lançar quando RESEND_API_KEY não estiver configurada', async () => {
    const module: TestingModule = await buildProvider({});
    const provider = module.get(ResendMailProvider);

    await expect(
      provider.send({
        to: 'leitor@example.com',
        subject: 'Assunto',
        html: '<p>Corpo</p>',
      }),
    ).resolves.toBeUndefined();

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('não deve lançar quando o Resend retornar erro', async () => {
    const module: TestingModule = await buildProvider({
      RESEND_API_KEY: 're_test_key',
    });
    const provider = module.get(ResendMailProvider);
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'domínio não verificado' },
    });

    await expect(
      provider.send({
        to: 'leitor@example.com',
        subject: 'Assunto',
        html: '<p>Corpo</p>',
      }),
    ).resolves.toBeUndefined();
  });
});
