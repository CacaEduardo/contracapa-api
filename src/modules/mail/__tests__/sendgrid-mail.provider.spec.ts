import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SendGridMailProvider } from 'src/modules/mail/providers/sendgrid-mail.provider';

const sendMock = jest.fn();
const setApiKeyMock = jest.fn();

jest.mock('@sendgrid/mail', () => ({
  setApiKey: (apiKey: string) => {
    setApiKeyMock(apiKey);
  },
  send: async (data: unknown) => {
    await sendMock(data);
  },
}));

describe('SendGridMailProvider', () => {
  function buildProvider(values: Record<string, string | undefined>) {
    return Test.createTestingModule({
      providers: [
        SendGridMailProvider,
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

  it('deve enviar e-mail via SendGrid com from configurado', async () => {
    const module: TestingModule = await buildProvider({
      SENDGRID_API_KEY: 'SG.test',
      MAIL_FROM_EMAIL: 'contato@bibliotecadomercado.com.br',
      MAIL_FROM_NAME: 'Biblioteca do Mercado',
    });
    const provider = module.get(SendGridMailProvider);
    sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);

    await provider.send({
      to: 'leitor@example.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    });

    expect(setApiKeyMock).toHaveBeenCalledWith('SG.test');
    expect(sendMock).toHaveBeenCalledWith({
      from: {
        email: 'contato@bibliotecadomercado.com.br',
        name: 'Biblioteca do Mercado',
      },
      to: 'leitor@example.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    });
  });

  it('deve usar remetente padrão quando MAIL_FROM_* não estiver configurado', async () => {
    const module: TestingModule = await buildProvider({
      SENDGRID_API_KEY: 'SG.test',
    });
    const provider = module.get(SendGridMailProvider);
    sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);

    await provider.send({
      to: 'leitor@example.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: {
          email: 'contato@bibliotecadomercado.com.br',
          name: 'Biblioteca do Mercado',
        },
      }),
    );
  });

  it('não deve lançar quando SENDGRID_API_KEY não estiver configurada', async () => {
    const module: TestingModule = await buildProvider({});
    const provider = module.get(SendGridMailProvider);

    await expect(
      provider.send({
        to: 'leitor@example.com',
        subject: 'Assunto',
        html: '<p>Corpo</p>',
      }),
    ).resolves.toBeUndefined();

    expect(setApiKeyMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('não deve lançar quando o SendGrid retornar erro', async () => {
    const module: TestingModule = await buildProvider({
      SENDGRID_API_KEY: 'SG.test',
    });
    const provider = module.get(SendGridMailProvider);
    sendMock.mockRejectedValue({
      message: 'Forbidden',
      response: {
        body: {
          errors: [{ message: 'remetente não verificado' }],
        },
      },
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
