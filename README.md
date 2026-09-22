# biblioteca-virtual-api

API NestJS da biblioteca virtual: autenticação JWT, usuários e seed do admin.

O frontend vive no repositório irmão `app/` (Next.js). A API não renderiza páginas — só expõe HTTP JSON.

## Stack

| Tecnologia | Detalhe |
|---|---|
| NestJS 12 | CommonJS |
| Node.js | 20.19+ ou 22.12+ |
| TypeScript | 6 |
| MongoDB | Mongoose (`@nestjs/mongoose`) |
| Auth | JWT (`@nestjs/jwt`, 7 dias) — sem Passport |
| Validação | Zod + `StandardSchemaValidationPipe` |
| Testes | Jest (`src/modules/<domínio>/__tests__/`) e e2e em `test/` |
| Package manager | Yarn 1 — não criar `package-lock.json` |

## Pré-requisitos

- Node.js 20.19+ ou 22.12+
- Yarn 1 (`yarn@1.22`)
- MongoDB (local, Atlas ou o serviço do `docker compose`)

## Setup local

```bash
cp .env.example .env
```

Preencha as variáveis (veja a tabela abaixo). `INTERNAL_TOKEN` precisa ser **o mesmo valor** do `.env` do app. `JWT_SECRET` e `INTERNAL_TOKEN` exigem no mínimo 16 caracteres.

```bash
yarn
yarn seed          # cria a conta de admin (idempotente)
yarn start:dev     # http://localhost:3001
```

Porta padrão local: `3001`. No container a API escuta `0.0.0.0:$PORT` (`8080` por padrão).

## Variáveis de ambiente

Copie `.env.example`. Nunca commite `.env` nem secrets preenchidos.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NODE_ENV` | não | `development` (padrão), `production` ou `test` |
| `PORT` | não | `3001` local; o container usa `8080` |
| `MONGO_URL` | sim | URI do MongoDB |
| `JWT_SECRET` | sim | Segredo do JWT da API (mín. 16 caracteres). Independente do `AUTH_SECRET` do app |
| `INTERNAL_TOKEN` | sim | Token compartilhado com o app (mín. 16). O Next envia `X-Internal-Token` em toda chamada |
| `ALLOWED_ORIGINS` | sim em browser | Origens CORS, separadas por vírgula. Ex.: `http://localhost:3000` |
| `SEED_ADMIN_NAME` | para o seed | Nome da conta de admin |
| `SEED_ADMIN_EMAIL` | para o seed | E-mail de login do admin |
| `SEED_ADMIN_PASSWORD` | para o seed | Senha inicial do admin |

O seed (`yarn seed`) só cria a conta se o e-mail ainda não existir. Sem as três `SEED_ADMIN_*`, o comando falha.

## Acesso e autenticação

Toda requisição precisa passar pelo `InternalAccessGuard`:

1. Header `X-Internal-Token` igual a `INTERNAL_TOKEN`, **ou**
2. `Origin`/`Referer` em `ALLOWED_ORIGINS`

Sem um dos dois: `403 Origem não autorizada`. O app sempre manda o token (chamadas server-side). CORS usa a mesma lista de origens.

Depois disso:

- `JwtAuthGuard` é global. Rotas públicas usam `@Public()`.
- Papéis: `admin` e `user`. Rotas administrativas usam `@Roles('admin')`.
- Senha nunca volta na resposta. Hash no create/update. Duplicate key Mongo (`11000`) vira `409`.
- Corpo de erro: `{ statusCode, message }`. Sucesso devolve o recurso direto, sem envelope `{ success: true }`.

## Rotas

Auth JWT = `Authorization: Bearer <token>`.

| Método | Caminho | Auth | Papel | O que faz |
|---|---|---|---|---|
| `POST` | `/auth/signin` | público | — | Login (`email`, `password`) → `{ user, token }` |
| `GET` | `/auth/me` | JWT | qualquer | Perfil da sessão |
| `PATCH` | `/auth/me` | JWT | qualquer | Atualiza o nome |
| `POST` | `/auth/change-password` | JWT | qualquer | Troca senha (zera `mustChangePassword`) |
| `POST` | `/users` | JWT | admin | Cria usuário |
| `GET` | `/users` | JWT | admin | Lista (`?role=&active=`) |
| `GET` | `/users/:id` | JWT | admin | Detalhe |
| `PATCH` | `/users/:id` | JWT | admin | Atualiza |
| `POST` | `/users/:id/reset-password` | JWT | admin | Nova senha provisória |

## Docker

Imagem multi-stage (`node:22-alpine`). O compose sobe MongoDB e a API:

```bash
docker compose up --build
```

API em `http://localhost:3001`. Mongo em `27017`. Variáveis vêm do `.env` local; `MONGO_URL` no container aponta para o serviço `mongo`.

## Scripts

| Comando | O que faz |
|---|---|
| `yarn start:dev` | Watch mode |
| `yarn start:debug` | Watch + inspector |
| `yarn start:prod` | `node dist/main` |
| `yarn seed` | Conta de admin (idempotente; exige `SEED_ADMIN_*`) |
| `yarn build` | Compila para `dist/` |
| `yarn lint` / `yarn lint:fix` | ESLint |
| `yarn test` | Unitários |
| `yarn test:watch` | Unitários em watch |
| `yarn test:cov` | Coverage |
| `yarn test:e2e` | E2e em `test/` |

Jest roda com `--experimental-vm-modules` (pacotes ESM do Nest 12). Não remova o flag.

## Arquitetura

```
src/
├── main.ts                 # pipes globais, CORS, listen em 0.0.0.0
├── app.module.ts           # config, Mongo, módulos, APP_GUARD
├── config/env.schema.ts    # Zod de env
├── common/                 # guards, decorators, filters
└── modules/<dominio>/      # auth, users
    ├── dto/
    ├── schemas/
    ├── __tests__/
    ├── x.controller.ts
    ├── x.service.ts
    └── x.module.ts
```

Um módulo por domínio. O dono do schema exporta o **service**; outros módulos não injetam o Model (`AuthModule` usa `UsersService`). Env só via `ConfigService` — nunca `process.env` solto (exceto `PORT` no bootstrap, depois da validação).

Código em inglês; mensagens de API em pt-BR.
