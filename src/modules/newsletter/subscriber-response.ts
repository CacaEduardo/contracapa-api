import type {
  SubscriberDocument,
  SubscriberStatus,
} from 'src/modules/newsletter/schemas/subscriber.schema';

export type PublicSubscriber = {
  _id: string;
  name: string;
  email: string;
  consent: boolean;
  status: SubscriberStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicSubscriber(
  subscriber: SubscriberDocument,
): PublicSubscriber {
  return {
    _id: subscriber._id.toString(),
    name: subscriber.name,
    email: subscriber.email,
    consent: subscriber.consent,
    status: subscriber.status,
    createdAt: subscriber.createdAt,
    updatedAt: subscriber.updatedAt,
  };
}
