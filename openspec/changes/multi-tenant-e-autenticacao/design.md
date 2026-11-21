# Design

## Context

Base atual (mudança `estrutura-monorepo`): API NestJS 12 (CJS, SWC) com `ConfigModule` validado por zod e `DatabaseModule` (`DbClient` Drizzle + `pg`); `packages/db` com schema vazio; `apps/admin` Next.js 16 com uma página estática; PDV Electron com renderer sandboxed, preload tipado (`window.superPdv`) e SQLite local; `packages/shared` compilado (ESM+CJS) com zod; `packages/ui` com `button`, `card` e `badge`. PostgreSQL 18 via Docker Compose e Testcontainers.

Decisões de produto (ver proposal.md): três públicos — equipe Super PDV (admin), cliente (gestor) e operação (PDV); empresas cadastradas só pela equipe; sem nível Loja; um usuário pertence a um único cliente; papéis fixos; primeiro membro da equipe por comando. O login no PDV fica para a mudança `login-no-pdv`, que consome a API definida aqui.

## Goals / Non-Goals

**Goals:**
- Isolamento entre clientes imposto pelo PostgreSQL (RLS), com acesso entre clientes restrito ao admin.
- Dois domínios de identidade (equipe e clientes) com o mesmo núcleo de autenticação, sem tokens intercambiáveis.
- Matriz de permissões única, compartilhada entre API, gestor e PDV.
- Fluxos completos de login no admin e no gestor e gestão de clientes, empresas, equipe e usuários.
- API de autenticação de clientes pronta para o PDV (mesmas rotas de login, renovação, troca de senha e `me`).

**Non-Goals:**
- Login no PDV (`login-no-pdv`); cadastro/ativação de PDVs (caixas), login offline, PIN e liberação por supervisor (`ativacao-do-caixa`).
- Papéis personalizados, papéis distintos dentro da equipe, convites, cadastro público, SSO, 2FA, auditoria.
- Deploy e provedor de e-mail de produção (integração SMTP genérica).

## Decisions

### D1. Renomear `admin` → `gestor` e criar o novo `admin`

- `git mv apps/admin apps/gestor`; pacote `@super-pdv/gestor`, porta **3000**; atualizar filtros do CI (`--filter`), README e relatórios do Playwright.
- Novo `apps/admin` (`@super-pdv/admin`), mesmo stack do gestor, porta **3001**.
- A lógica de sessão web comum (cliente da API do lado do servidor, cookies, `proxy.ts`, renovação) vai para um pacote novo **`packages/web-session`** (código-fonte TS, consumido via `transpilePackages`), parametrizado por app (prefixo das rotas de auth da API e nome dos cookies). Evita duplicar código sensível de segurança.

### D2. Modelo de dados (`packages/db`)

| Tabela | Colunas principais | RLS |
| --- | --- | --- |
| `clientes` | `id`, `nome`, `ativo` | não (acesso pelo admin) |
| `empresas` | `id`, `tenant_id → clientes`, `cnpj` (**único global**), `razao_social`, `nome_fantasia`, `ativa` | sim |
| `usuarios` | `id`, `tenant_id`, `nome`, `email` (único global, minúsculo), `senha_hash`, `senha_temporaria`, `papel`, `ativo` | sim |
| `usuario_empresas` | `tenant_id`, `usuario_id`, `empresa_id` (FKs compostas com `tenant_id`) | sim |
| `equipe_membros` | `id`, `nome`, `email` (único), `senha_hash`, `senha_temporaria`, `ativo` | não |
| `sessoes` | `id`, `dominio` (`cliente`/`equipe`), `usuario_id?`, `membro_id?`, `expira_em`, `revogada_em`, `user_agent` | não |
| `refresh_tokens` | `id`, `sessao_id`, `token_hash`, `usado_em` | não |
| `password_resets` | `id`, `dominio`, `usuario_id?`, `membro_id?`, `token_hash`, `expira_em`, `usado_em` | não |
| `login_throttle` | `dominio`, `email`, `falhas`, `janela_inicio`, `bloqueado_ate` | não |

- IDs `uuid` com default `uuidv7()` (nativo no PostgreSQL 18). `papel` como enum (`dono`, `administrador`, `gerente`, `operador`). `CHECK` garante que sessões/resets tenham exatamente um sujeito conforme o domínio.
- Tabelas sem `tenant_id` só são acessadas pelo caminho privilegiado (D3).

### D3. Isolamento com RLS e dois caminhos de acesso

- A migration cria o papel `superpdv_app` (`NOLOGIN`, sem `BYPASSRLS`), concede-o ao usuário de conexão e dá `SELECT/INSERT/UPDATE` nas tabelas com RLS.
- Políticas `USING`/`WITH CHECK` `tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`; sem contexto, nada é visível.
- **`TenantDb`** (rotas do gestor e do PDV): transação com `SET LOCAL ROLE superpdv_app` e `set_config('app.tenant_id', <da sessão>, true)`; contexto via `nestjs-cls`.
- **`SystemDb`** (dono das tabelas; RLS sem `FORCE`): usado **somente** por `AuthModule`, `AdminModule` (rotas da equipe, que por definição veem vários clientes) e pelos comandos CLI. Um teste garante que nenhum outro módulo o injeta.
- Alternativas descartadas: filtros só no código; schema por cliente; segunda credencial de banco.

### D4. Autenticação com dois domínios

- Núcleo único (`AuthCore`) parametrizado por domínio: hash argon2id (`@node-rs/argon2`, N-API, OWASP m=19 MiB/t=2/p=1), política de senha, senha temporária, sessões, renovação rotativa com detecção de reuso (revoga a sessão), expiração de 30 dias, bloqueio por e-mail (5 falhas/15 min → 15 min), recuperação (1 h, uso único), comparação em tempo constante para e-mail inexistente.
- **Token de acesso**: JWT HS256 (`jose`), 15 min, `aud` = `cliente` ou `equipe`, `sub`, `sid` e, para clientes, `tid`. Guards distintos aceitam só a própria audiência e **recarregam do banco** a cada requisição o sujeito (ativo; para clientes também cliente ativo, papel, empresas, senha temporária) e a sessão — mudanças e suspensões valem na hora.
- Rotas: clientes em `/v1/auth/*` e `/v1/...`; equipe em `/v1/admin/auth/*` e `/v1/admin/...`. Links de recuperação apontam para `GESTOR_URL` ou `ADMIN_URL` conforme o domínio.
- Limite por IP com `@nestjs/throttler` (20 req/min) nas rotas de auth.
- Guard de senha temporária: 403 `PASSWORD_CHANGE_REQUIRED` em tudo, exceto `me`, troca de senha e logout.

### D5. Permissões compartilhadas (`packages/shared`)

- `PERMISSOES`: `gestor.acessar`, `pdv.operar`, `empresa.ler`, `usuario.ler`, `usuario.gerenciar`, `usuario.gerenciar_operadores`.
- `PERMISSOES_POR_PAPEL`: Dono e Administrador — todas; Gerente — `gestor.acessar`, `pdv.operar`, `empresa.ler`, `usuario.ler`, `usuario.gerenciar_operadores`; Operador — `pdv.operar`.
- Regras dependentes de dados (proteção do Dono, último Dono, escopo por empresa, não desativar a si mesmo) nos serviços. A equipe não usa papéis nesta mudança: todo membro ativo tem acesso total ao admin.

### D6. API HTTP

- Clientes (usadas pelo gestor e, na mudança `login-no-pdv`, pelo PDV): `POST /v1/auth/login|refresh|logout|senha|recuperacao|recuperacao/confirmar`, `GET /v1/me` (papel, permissões e **empresas em que pode atuar, ativas**), `GET /v1/empresas`, `GET /v1/empresas/:id`, `GET|POST /v1/usuarios`, `GET|PATCH /v1/usuarios/:id`, `POST /v1/usuarios/:id/redefinir-senha`.
- Equipe: `POST /v1/admin/auth/...` (mesmo conjunto), `GET /v1/admin/me`, `GET|POST /v1/admin/clientes` (busca por nome/CNPJ), `GET|PATCH /v1/admin/clientes/:id` (suspender/reativar), `POST /v1/admin/clientes/:id/empresas`, `PATCH /v1/admin/empresas/:id`, `POST /v1/admin/usuarios/:id/redefinir-senha` (somente Donos), `GET|POST /v1/admin/equipe`, `PATCH /v1/admin/equipe/:id`, `POST /v1/admin/equipe/:id/redefinir-senha`.
- Corpos validados por schemas zod de `packages/shared` (`ZodValidationPipe`); erros `{ statusCode, code, message, fieldErrors? }`. Registro de outro cliente → 404; falta de permissão → 403; token de outro domínio → 401.

### D7. CNPJ (`packages/shared`)

Função única para CNPJ numérico e alfanumérico (IN RFB 2.229/2024): normaliza (sem máscara, maiúsculas), exige `[0-9A-Z]{12}[0-9]{2}`, dígitos por módulo 11 com valor = código ASCII − 48; rejeita sequências repetidas. Máscara de exibição `XX.XXX.XXX/XXXX-XX`.

### D8. Comandos CLI (`apps/api/src/cli`)

- `pnpm --filter @super-pdv/api equipe:criar -- --nome … --email …`: cria membro da equipe com senha temporária (bootstrap).
- `pnpm --filter @super-pdv/api seed:dev`: membro da equipe, cliente "Demonstração" com duas empresas e um usuário de cada papel, com senhas fixas documentadas (recusa rodar com `NODE_ENV=production`).
- Ambos via `NestFactory.createApplicationContext`, reutilizando serviços e validações, numa transação.

### D9. Sessão web (`packages/web-session`, admin e gestor)

- BFF: o navegador nunca chama a API. Server Actions e Route Handlers chamam a API (`API_URL`, só no servidor) e guardam os tokens em cookies `httpOnly`, `SameSite=Lax`, `Secure` em produção, com nomes por app (`spdv_gestor_*`, `spdv_admin_*`). Server Actions já validam a origem (CSRF).
- `proxy.ts` (Next 16): sem sessão → `/login?next=…`; token expirando em < 60 s → renova antes de renderizar e regrava cookies.
- Formulários com Server Actions + `useActionState` (React 19): validação com os schemas zod de `packages/shared` na action e novamente na API; `fieldErrors` da API mapeados para os campos. Funcionam sem JavaScript extra no cliente (alternativa descartada: `react-hook-form`, que duplicaria o estado do formulário no navegador sem ganho para estes casos).
- Novos componentes shadcn em `packages/ui`: `input`, `label`, `field`, `select`, `checkbox`, `table`, `dialog`, `alert`, `dropdown-menu`, `sidebar`, `sonner`.
- Telas comuns aos dois apps: `/login`, `/trocar-senha`, `/esqueci-senha`, `/redefinir-senha`, layout autenticado com menu lateral.
- **Admin**: `/clientes` (busca), `/clientes/novo` (cliente + 1ª empresa + Dono, exibe senha uma vez), `/clientes/[id]` (empresas, Donos, suspender/reativar, redefinir senha do Dono), formulário de empresa, `/equipe`.
- **Gestor**: `/empresas` (somente leitura), `/usuarios` (listagem, filtros, criação, edição, desativar/reativar, redefinir senha), `/acesso-negado`, aviso para Operador de caixa.

### D10. E-mail e ambiente

- `Mailer` com SMTP (`nodemailer`) e implementação em memória para testes; Mailpit no `docker-compose.yml` (SMTP 1025, web 8025).
- API: `JWT_SECRET` (≥ 32), `GESTOR_URL`, `ADMIN_URL`, `SMTP_URL`, `MAIL_FROM`. Admin e gestor: `API_URL`. Todos validados com zod e documentados nos `.env.example`.

### D11. Testes e CI

- **Unitários**: CNPJ, matriz de permissões, política e geração de senha, schemas.
- **Integração da API** (Testcontainers + Mailpit): RLS direto no banco; catálogo sem tabela `tenant_id` desprotegida; `SystemDb` restrito; fluxos de auth dos dois domínios; tokens cruzados → 401; matriz papel × rota; escopo por empresa; regras do Dono; isolamento HTTP entre clientes; admin (clientes, empresas, suspensão, equipe); comandos CLI.
- **E2E admin e gestor** (Playwright, API e banco reais com `seed:dev`): login, troca obrigatória, recuperação via API do Mailpit, cadastro de cliente/empresa/usuário, acesso negado, Operador bloqueado no gestor, suspensão do cliente.
- **CI**: job Linux sobe Postgres + Mailpit (`docker compose`), migra e roda `seed:dev` antes dos E2E de admin e gestor; filtros atualizados para `@super-pdv/gestor`.

## Risks / Trade-offs

- [Renomear `admin` quebra referências (CI, README, filtros, scripts)] → renomeação como primeira tarefa, com `pnpm lint typecheck test build` e busca por `@super-pdv/admin` antigo antes de seguir.
- [Um módulo usar o `SystemDb` por engano] → injeção permitida só em `AuthModule`, `AdminModule` e CLI, verificada por teste.
- [Tabela nova de negócio sem RLS] → teste no catálogo do PostgreSQL.
- [`CREATE ROLE`/`SET ROLE` indisponível no Postgres gerenciado] → validar na escolha da hospedagem.
- [Consulta extra por requisição nos guards] → índices; cache curto se necessário.
- [Throttler por IP em memória] → bloqueio por e-mail é persistente; Redis quando houver várias instâncias.
- [`JWT_SECRET` vazado] → tokens forjados ainda exigem sessão válida no banco; rotação força novo login.

## Migration Plan

1. Renomear apps e ajustar CI/README em commit próprio dentro da mudança.
2. Migration Drizzle com enum, tabelas, papel `superpdv_app`, grants e políticas (idempotente para o papel).
3. Sem produção ainda: rollback = reverter o merge e `docker compose down -v`.
4. No primeiro deploy: `equipe:criar` para o primeiro membro; clientes passam a ser criados pelo admin.

## Open Questions

- Provedor de e-mail de produção (Resend, SES, SMTP do domínio): não muda a implementação.
- Hospedagem do banco (confirmar `CREATE ROLE NOLOGIN` e `SET ROLE`) e domínios do admin e do gestor.
