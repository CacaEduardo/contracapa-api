import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  MONGO_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  INTERNAL_TOKEN: z.string().min(16),
  ALLOWED_ORIGINS: z.string().optional(),
  SEED_ADMIN_NAME: z.string().optional(),
  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  FRONTEND_URL: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_DEFAULT_REGION: z.string().min(1),
  BUCKET_NAME: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM_EMAIL: z.string().optional(),
  MAIL_FROM_NAME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
