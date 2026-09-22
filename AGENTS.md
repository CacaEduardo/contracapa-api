# AGENTS — api

API NestJS da biblioteca virtual.

## Stack

| Tecnologia | Versão / detalhe |
|---|---|
| NestJS | 12 (CommonJS) |
| Node.js | 20.19+ ou 22.12+ |
| TypeScript | 6 |
| MongoDB | Mongoose via `@nestjs/mongoose` |
| Auth | JWT (`@nestjs/jwt` + Guard; sem Passport) |
| Validação | Zod + `StandardSchemaValidationPipe` |
| Config | `@nestjs/config` + schema Zod |
| Testes | Jest + `@nestjs/testing` |

Este arquivo é a **fonte única de convenções do agente** neste subprojeto.

## Regras globais obrigatórias

- **Idioma:** código em inglês; mensagens de API em pt-BR.
- **Package manager:** Yarn 1. Não criar `package-lock.json`.
- **Secrets:** nunca commitar `.env`, URIs de banco ou `JWT_SECRET`. `.env.example` só com chaves vazias.

## Arquitetura

```
src/
├── main.ts                 # pipes globais, CORS, listen
├── app.module.ts           # config, persistência, feature modules, APP_GUARD
├── config/env.schema.ts    # Zod de env — sem regra de negócio
├── common/                 # guards, decorators, filters — sem regra de negócio
└── modules/<dominio>/
    ├── dto/
    ├── schemas/            # só no módulo dono
    ├── __tests__/
    ├── x.controller.ts
    ├── x.service.ts
    └── x.module.ts
```

- Um módulo por domínio (`auth`, `users`), não por tabela. O dono **exporta o service**; outros módulos não injetam o Model (`AuthModule` usa `UsersService`).
- Código só sobe para `common/` quando um segundo módulo precisa. Filter que conhece um domínio sai de `common/`.
- Env: `ConfigModule.forRoot({ isGlobal: true, validationSchema })`. Leia só via `ConfigService` — nunca `process.env` solto (exceto `PORT` no bootstrap, depois da validação).
- Mongoose e JWT com `forRootAsync` / `registerAsync` + `ConfigService`. `JwtModule` é `global: true`.
- `JwtAuthGuard` é `APP_GUARD`. Públicas com `@Public()`: `POST /auth/signin`. Usuário via `@CurrentUser()`. Sem middleware Express para JWT.
- Papéis: `admin` | `user`. Rotas administrativas usam `@Roles('admin')`.

## Padrões de código

- Named exports. Arquivos Nest: `users.controller.ts`, `users.service.ts`, `users.module.ts`.
- DTOs = schema Zod + tipo inferido. Rotas: `@Body({ schema: createUserSchema }) body: CreateUserDto`. Tipos em parâmetros decorados com `import type`.
- Pipe global: `StandardSchemaValidationPipe`. Sem `class-validator`, classes DTO ou `@nestjs/mapped-types` — use `.partial()` do Zod.
- Controller: HTTP. Service: negócio e persistência. Sem `try/catch` genérico que vira 500; `HttpException` só no caso de domínio. `Logger` do Nest, nunca `console`.
- Resposta: o recurso direto, sem `{ success: true }`. Erros via `HttpException` (`{ statusCode, message }`).
- Senha: `select: false`; login usa `.select('+password')`; nunca na resposta. Hash no create e no update (objeto novo, não mutar o DTO).
- Schemas com `timestamps: true`. Id inexistente → `NotFoundException`. Duplicate key Mongo (`11000`) → 409 no filter de `common/filters`.

## Testes

Unitários em `src/modules/<dominio>/__tests__/*.spec.ts`. E2E em `test/*.e2e-spec.ts`.

- Sem co-localização. Aqui é `__tests__/`, não `tests/` (convenção do frontend).
- Imports com alias `src/...`.
- `@nestjs/testing` + `Test.createTestingModule`. Mock via `useValue`. `getModelToken` só no módulo dono do schema; nos outros, mock o service exportado.
- Cubra comportamento (feliz, 401/404/409, senha ausente na resposta), não só `should be defined`. `describe`/`it` podem ser em pt-BR.
- E2E sem Mongo real e sem boilerplate `Hello World`.
- Scripts `yarn test` / `yarn test:e2e` passam `--experimental-vm-modules` (pacotes ESM do Nest 12). Não remova o flag.
