import { z } from 'zod';
import { mongoIdSchema } from 'src/common/dto/mongo-id.dto';

export const transferBookSchema = z.object({
  targetId: mongoIdSchema,
});

export type TransferBookDto = z.infer<typeof transferBookSchema>;
