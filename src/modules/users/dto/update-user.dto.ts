import { z } from 'zod';
import { createUserSchema } from 'src/modules/users/dto/create-user.dto';

export const updateUserSchema = createUserSchema.partial().extend({
  active: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
