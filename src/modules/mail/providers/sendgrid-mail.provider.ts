import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { Env } from 'src/config/env.schema';
import type {
  MailProvider,
  SendMailParams,
} from 'src/modules/mail/mail-provider.interface';

const DEFAULT_FROM_EMAIL = 'contato@bibliotecadomercado.com.br';
const DEFAULT_FROM_NAME = 'Biblioteca do Mercado';

@Injectable()
export class SendGridMailProvider implements MailProvider {
  private readonly logger = new Logger(SendGridMailProvider.name);
  private readonly enabled: boolean;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('SENDGRID_API_KEY', { infer: true });
    this.enabled = Boolean(apiKey);
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
    this.fromEmail =
      config.get('MAIL_FROM_EMAIL', { infer: true }) ?? DEFAULT_FROM_EMAIL;
    this.fromName =
      config.get('MAIL_FROM_NAME', { infer: true }) ?? DEFAULT_FROM_NAME;
  }

  async send({ to, subject, html }: SendMailParams): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(
        `SENDGRID_API_KEY não configurada — e-mail não enviado (to=${to}, subject="${subject}")`,
      );
      return;
    }

    try {
      await sgMail.send({
        to,
        from: { email: this.fromEmail, name: this.fromName },
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail via SendGrid: ${describeSendGridError(error)}`,
      );
    }
  }
}

function describeSendGridError(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'body' in error.response &&
    error.response.body &&
    typeof error.response.body === 'object' &&
    'errors' in error.response.body &&
    Array.isArray(error.response.body.errors)
  ) {
    const messages = error.response.body.errors
      .map((item: { message?: string }) => item.message)
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      return messages.join('; ');
    }
  }

  return error instanceof Error ? error.message : String(error);
}
