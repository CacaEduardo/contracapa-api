import { ConfigService } from '@nestjs/config';
import { Env } from 'src/config/env.schema';
import { UsersService } from 'src/modules/users/users.service';

export type SeedAdminResult = 'created' | 'skipped';

export async function seedAdmin(
  usersService: UsersService,
  config: ConfigService<Env, true>,
): Promise<SeedAdminResult> {
  const email = config.get('SEED_ADMIN_EMAIL', { infer: true });

  if (!email) {
    throw new Error(
      'SEED_ADMIN_EMAIL não está definido. Configure a variável antes de executar o seed.',
    );
  }

  const name = config.get('SEED_ADMIN_NAME', { infer: true });
  const password = config.get('SEED_ADMIN_PASSWORD', { infer: true });

  if (!name || !password) {
    throw new Error(
      'SEED_ADMIN_NAME e SEED_ADMIN_PASSWORD são obrigatórios para criar a conta de admin.',
    );
  }

  const existing = await usersService.findByEmailWithPassword(email);

  if (existing) {
    return 'skipped';
  }

  await usersService.create({
    name,
    email,
    password,
    role: 'admin',
  });

  return 'created';
}
