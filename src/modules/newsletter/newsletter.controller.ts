import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  confirmSubscriptionQuerySchema,
  type ConfirmSubscriptionQueryDto,
} from 'src/modules/newsletter/dto/confirm-subscription-query.dto';
import {
  listSubscribersQuerySchema,
  type ListSubscribersQueryDto,
} from 'src/modules/newsletter/dto/list-subscribers-query.dto';
import {
  subscribeSchema,
  type SubscribeDto,
} from 'src/modules/newsletter/dto/subscribe.dto';
import { NewsletterService } from 'src/modules/newsletter/newsletter.service';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  subscribe(@Body({ schema: subscribeSchema }) body: SubscribeDto) {
    return this.newsletterService.subscribe(body);
  }

  @Get('confirm')
  @Public()
  async confirm(
    @Query({ schema: confirmSubscriptionQuerySchema })
    query: ConfirmSubscriptionQueryDto,
  ) {
    await this.newsletterService.confirm(query);
    return { confirmed: true };
  }

  @Get('subscribers')
  @Roles('admin')
  findAll(
    @Query({ schema: listSubscribersQuerySchema })
    query: ListSubscribersQueryDto,
  ) {
    return this.newsletterService.findAll(query);
  }
}
