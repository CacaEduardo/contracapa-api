import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailModule } from 'src/modules/mail/mail.module';
import { NewsletterController } from 'src/modules/newsletter/newsletter.controller';
import { NewsletterService } from 'src/modules/newsletter/newsletter.service';
import {
  Subscriber,
  SubscriberSchema,
} from 'src/modules/newsletter/schemas/subscriber.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscriber.name, schema: SubscriberSchema },
    ]),
    MailModule,
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
