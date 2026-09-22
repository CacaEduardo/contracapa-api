import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Env } from 'src/config/env.schema';
import type {
  MailProvider,
  SendMailParams,
} from 'src/modules/mail/mail-provider.interface';

@Injectable()
export class ResendMailProvider implements MailProvider {
  private readonly logger = new Logger(ResendMailProvider.name);
  private readonly client: Resend | null;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('RESEND_API_KEY', { infer: true });
    this.client = apiKey ? new Resend(apiKey) : null;
    this.fromEmail =
      config.get('MAIL_FROM_EMAIL', { infer: true }) ?? 'onboarding@resend.dev';
    this.fromName =
      config.get('MAIL_FROM_NAME', { infer: true }) ?? 'Contracapa';
  }

  async send({ to, subject, html }: SendMailParams): Promise<void> {
    if (!this.client) {
      this.logger.warn(
        `RESEND_API_KEY não configurada — e-mail não enviado (to=${to}, subject="${subject}")`,
      );
      return;
    }

    const { error } = await this.client.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Falha ao enviar e-mail via Resend: ${error.message}`);
    }
  }
}
