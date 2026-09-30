import { z } from 'zod';
import { createBookSchema } from 'src/modules/books/dto/create-book.dto';

export const updateBookSchema = createBookSchema
  .extend({ active: z.boolean() })
  .partial();

export type UpdateBookDto = z.infer<typeof updateBookSchema>;
