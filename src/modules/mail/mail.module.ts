import { Module } from '@nestjs/common';
import { MAIL_PROVIDER } from 'src/modules/mail/mail-provider.interface';
import { MailService } from 'src/modules/mail/mail.service';
import { SendGridMailProvider } from 'src/modules/mail/providers/sendgrid-mail.provider';

@Module({
  providers: [
    { provide: MAIL_PROVIDER, useClass: SendGridMailProvider },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
