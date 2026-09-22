export type SendMailParams = {
  to: string;
  subject: string;
  html: string;
};

export interface MailProvider {
  send(params: SendMailParams): Promise<void>;
}

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');
