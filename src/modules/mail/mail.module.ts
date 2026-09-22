import { Module } from '@nestjs/common';
import { MAIL_PROVIDER } from 'src/modules/mail/mail-provider.interface';
import { MailService } from 'src/modules/mail/mail.service';
import { ResendMailProvider } from 'src/modules/mail/providers/resend-mail.provider';

@Module({
  providers: [
    { provide: MAIL_PROVIDER, useClass: ResendMailProvider },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
