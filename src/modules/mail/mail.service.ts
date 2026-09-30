import { Inject, Injectable } from '@nestjs/common';
import {
  MAIL_PROVIDER,
  type MailProvider,
} from 'src/modules/mail/mail-provider.interface';
import { passwordResetTemplate } from 'src/modules/mail/templates/password-reset.template';

@Injectable()
export class MailService {
  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    return this.provider.send({
      to,
      subject: 'Redefinição de senha — Contracapa',
      html: passwordResetTemplate(resetUrl),
    });
  }
}
