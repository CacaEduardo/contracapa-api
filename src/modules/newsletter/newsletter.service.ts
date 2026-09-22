import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { Model } from 'mongoose';
import { escapeRegExp } from 'src/common/lib/escape-regexp';
import { Env } from 'src/config/env.schema';
import type { ConfirmSubscriptionQueryDto } from 'src/modules/newsletter/dto/confirm-subscription-query.dto';
import type { ListSubscribersQueryDto } from 'src/modules/newsletter/dto/list-subscribers-query.dto';
import type { SubscribeDto } from 'src/modules/newsletter/dto/subscribe.dto';
import {
  Subscriber,
  type SubscriberDocument,
} from 'src/modules/newsletter/schemas/subscriber.schema';
import {
  toPublicSubscriber,
  type PublicSubscriber,
} from 'src/modules/newsletter/subscriber-response';
import { MailService } from 'src/modules/mail/mail.service';

const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

type SubscriberQueryFilter = {
  $or?: Array<{ name: RegExp } | { email: RegExp }>;
};

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    @InjectModel(Subscriber.name)
    private readonly subscriberModel: Model<SubscriberDocument>,
    private readonly mailService: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async subscribe(dto: SubscribeDto): Promise<PublicSubscriber> {
    const existing = await this.subscriberModel
      .findOne({ email: dto.email })
      .exec();

    if (existing) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    const token = randomBytes(32).toString('hex');

    const created = await this.subscriberModel.create({
      name: dto.name,
      email: dto.email,
      consent: dto.consent,
      status: 'pending',
      confirmationTokenHash: this.hashToken(token),
      confirmationExpiresAt: new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS),
    });

    const confirmUrl = `${this.config.get('FRONTEND_URL', { infer: true })}/newsletter/confirmar?token=${token}`;

    try {
      await this.mailService.sendNewsletterConfirmation(
        dto.email,
        dto.name,
        confirmUrl,
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar e-mail de confirmação de newsletter: ${String(error)}`,
      );
    }

    return toPublicSubscriber(created);
  }

  async confirm({ token }: ConfirmSubscriptionQueryDto): Promise<void> {
    const subscriber = await this.subscriberModel
      .findOne({
        confirmationTokenHash: this.hashToken(token),
        confirmationExpiresAt: { $gt: new Date() },
      })
      .exec();

    if (!subscriber) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    await this.subscriberModel
      .findByIdAndUpdate(subscriber._id, {
        status: 'confirmed',
        confirmationTokenHash: null,
        confirmationExpiresAt: null,
      })
      .exec();
  }

  async findAll(query: ListSubscribersQueryDto): Promise<PublicSubscriber[]> {
    const filter: SubscriberQueryFilter = {};

    if (query.q) {
      const regex = new RegExp(escapeRegExp(query.q), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const subscribers = await this.subscriberModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    return subscribers.map(toPublicSubscriber);
  }

  async count(): Promise<number> {
    return this.subscriberModel.countDocuments().exec();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
