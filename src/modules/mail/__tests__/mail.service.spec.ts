import { Test, TestingModule } from '@nestjs/testing';
import {
  MAIL_PROVIDER,
  type SendMailParams,
} from 'src/modules/mail/mail-provider.interface';
import { MailService } from 'src/modules/mail/mail.service';

describe('MailService', () => {
  let service: MailService;

  const mockProvider = {
    send: jest.fn<Promise<void>, [SendMailParams]>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MAIL_PROVIDER, useValue: mockProvider },
      ],
    }).compile();

    service = module.get(MailService);
    jest.clearAllMocks();
  });

  it('deve enviar e-mail de redefinição de senha com o link informado', async () => {
    await service.sendPasswordReset(
      'admin@example.com',
      'https://bibliotecadomercado.com.br/redefinir-senha?token=xyz',
    );

    const call = mockProvider.send.mock.calls[0][0];

    expect(call.to).toBe('admin@example.com');
    expect(call.subject).toBe('Redefinição de senha — Biblioteca do Mercado');
    expect(call.html).toContain(
      'https://bibliotecadomercado.com.br/redefinir-senha?token=xyz',
    );
    expect(call.html).toContain('Biblioteca do Mercado');
  });
});
