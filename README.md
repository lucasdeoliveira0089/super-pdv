# Super PDV

Software de gestão comercial para o varejo: ponto de venda (PDV) desktop, gestor web do cliente, admin web da equipe Super PDV e API central, em um monorepo TypeScript.

| Caminho           | Pacote              | Descrição                                   |
| ----------------- | ------------------- | ------------------------------------------- |
| `apps/pdv`        | `@super-pdv/pdv`    | PDV desktop (Electron + React)              |
| `apps/admin`      | `@super-pdv/admin`  | Admin da equipe Super PDV (Next.js)         |
| `apps/gestor`     | `@super-pdv/gestor` | Gestor do cliente (Next.js)                 |
| `apps/api`        | `@super-pdv/api`    | API central (NestJS)                        |
| `packages/ui`     | `@super-pdv/ui`     | Componentes compartilhados (shadcn/ui)      |
| `packages/shared` | `@super-pdv/shared` | Tipos e schemas (zod) compartilhados        |
| `packages/db`     | `@super-pdv/db`     | Drizzle ORM, schema e migrations (Postgres) |
| `packages/config` | `@super-pdv/config` | tsconfig, ESLint e Prettier compartilhados  |

## Visão geral

| App    | Porta | Quem usa                               | Para quê                                                    |
| ------ | ----- | -------------------------------------- | ----------------------------------------------------------- |
| admin  | 3001  | Equipe Super PDV                       | Cadastrar clientes e as empresas (CNPJs) que usam o sistema |
| gestor | 3000  | Cliente (Dono, Administrador, Gerente) | Consultar as empresas e gerenciar usuários                  |
| pdv    | —     | Operação de caixa                      | Vender (login no PDV chega na mudança `login-no-pdv`)       |
| api    | 3333  | Todos os apps                          | Regras de negócio, autenticação e dados                     |

Hierarquia: **Cliente** (tenant) → **Empresa** (CNPJ; cada estabelecimento tem o seu) → **PDV**. Os dados de cada cliente ficam isolados no PostgreSQL por Row Level Security.

O desenvolvimento segue SDD com [OpenSpec](https://github.com/Fission-AI/OpenSpec): specs em `openspec/specs/`, mudanças em andamento em `openspec/changes/`.

## Pré-requisitos

- **Node.js 24** (versão fixada em `.nvmrc`; a instalação falha com outra versão)
- **Corepack** habilitado, para usar a versão do pnpm fixada no `package.json`:
  ```sh
  corepack enable pnpm
  ```
- **Docker Desktop** em execução (banco local e testes de integração). No Windows, exige virtualização habilitada na BIOS e WSL 2 (`wsl --install --no-distribution` em um terminal de administrador).

## Instalação

```sh
pnpm install
```

## Comandos

Todos executados na raiz e orquestrados pelo Turborepo:

| Comando          | O que faz                                       |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Inicia todos os apps em modo de desenvolvimento |
| `pnpm build`     | Build de todos os apps e pacotes                |
| `pnpm lint`      | ESLint em todo o monorepo                       |
| `pnpm typecheck` | Checagem de tipos em todo o monorepo            |
| `pnpm test`      | Testes unitários e de integração                |
| `pnpm test:e2e`  | Testes end-to-end (Playwright)                  |

Para executar um único app ou pacote, use o filtro do pnpm, por exemplo `pnpm --filter @super-pdv/api dev`.

## Primeiros passos

```sh
pnpm install
pnpm db:up                                   # PostgreSQL + Mailpit
pnpm db:migrate
cp apps/api/.env.example apps/api/.env
pnpm db:seed                                 # dados de demonstração
pnpm dev                                     # API, admin, gestor e PDV
```

Credenciais criadas pelo `pnpm db:seed` (somente desenvolvimento):

| Onde   | E-mail                  | Senha             | Papel                                    |
| ------ | ----------------------- | ----------------- | ---------------------------------------- |
| admin  | `equipe@superpdv.local` | `Equipe#Demo2026` | Equipe Super PDV                         |
| gestor | `dono@demo.local`       | `Demo#Senha2026`  | Dono (todas as empresas)                 |
| gestor | `admin@demo.local`      | `Demo#Senha2026`  | Administrador (todas as empresas)        |
| gestor | `gerente@demo.local`    | `Demo#Senha2026`  | Gerente (Mercado Demo Centro)            |
| gestor | `operador@demo.local`   | `Demo#Senha2026`  | Operador de caixa (sem acesso ao gestor) |

O comando é idempotente e recusa rodar com `NODE_ENV=production`.

## Banco de dados e e-mail locais

O PostgreSQL de desenvolvimento roda no Docker (`docker-compose.yml`), com os dados persistidos em um volume nomeado. Junto dele roda o **Mailpit**, que captura todos os e-mails enviados pela API (ex.: recuperação de senha) sem entregá-los a ninguém: a caixa de entrada fica em http://localhost:8025.

| Comando            | O que faz                                                              |
| ------------------ | ---------------------------------------------------------------------- |
| `pnpm db:up`       | Sobe o PostgreSQL e o Mailpit e aguarda ficarem saudáveis              |
| `pnpm db:down`     | Para os serviços (os dados continuam no volume)                        |
| `pnpm db:migrate`  | Aplica as migrations pendentes de `packages/db/migrations`             |
| `pnpm db:generate` | Gera uma nova migration a partir do schema em `packages/db/src/schema` |
| `pnpm db:seed`     | Cria os dados de demonstração                                          |

As credenciais padrão estão em `.env.example` (`postgres://superpdv:superpdv@localhost:5432/superpdv`). Para alterá-las, copie o arquivo para `.env` na raiz e ajuste os valores; o Docker Compose e o `drizzle-kit` leem esse arquivo.

Para apagar todos os dados locais e começar do zero: `docker compose down -v`.

## API (`apps/api`)

1. Copie `apps/api/.env.example` para `apps/api/.env` (os valores padrão apontam para o banco local).
2. Com o banco no ar (`pnpm db:up`), execute:
   ```sh
   pnpm --filter @super-pdv/api dev     # desenvolvimento, com recarga automática
   pnpm --filter @super-pdv/api build   # build de produção em apps/api/dist
   pnpm --filter @super-pdv/api start   # executa o build
   ```

A API escuta em `http://localhost:3333` e recusa iniciar se alguma variável obrigatória estiver ausente ou inválida:

| Variável                 | Obrigatória | Descrição                                                                    |
| ------------------------ | ----------- | ---------------------------------------------------------------------------- |
| `DATABASE_URL`           | sim         | Conexão com o PostgreSQL                                                     |
| `JWT_SECRET`             | sim         | Segredo dos tokens de acesso (≥ 32 caracteres; aleatório em produção)        |
| `GESTOR_URL`             | sim         | URL pública do gestor (links de recuperação de senha dos clientes)           |
| `ADMIN_URL`              | sim         | URL pública do admin (links de recuperação de senha da equipe)               |
| `SMTP_URL`               | sim         | Servidor de e-mail, ex.: `smtp://localhost:1025` (Mailpit)                   |
| `MAIL_FROM`              | sim         | Remetente dos e-mails                                                        |
| `PORT`                   | não         | Porta HTTP (padrão 3333)                                                     |
| `LIMITE_AUTH_POR_MINUTO` | não         | Requisições por minuto, por IP, nas rotas de login e recuperação (padrão 20) |

Rotas de negócio ficam sob `/v1` e **exigem login por padrão**; as rotas da equipe ficam sob `/v1/admin`. Os detalhes das regras estão nas specs em `openspec/specs/`.

### Equipe Super PDV: primeiro acesso

Em um ambiente novo (sem o seed), crie o primeiro membro da equipe pelo comando interno. Ele recebe uma senha temporária, trocada no primeiro acesso ao admin; os demais membros são cadastrados pelo próprio admin.

```sh
pnpm --filter @super-pdv/api equipe:criar -- --nome "Fulana" --email fulana@superpdv.com.br
```

### Endpoints de saúde

Públicos, sem autenticação, e sem expor detalhes de infraestrutura:

| Endpoint            | Uso                                     | Respostas                                                                                                 |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /health/live`  | O processo está de pé (não usa o banco) | `200 {"status":"ok","checks":{}}`                                                                         |
| `GET /health/ready` | A API consegue acessar o banco (2 s)    | `200 {"status":"ok","checks":{"database":"up"}}` ou `503 {"status":"error","checks":{"database":"down"}}` |

```sh
curl http://localhost:3333/health/live
curl http://localhost:3333/health/ready
```

Os testes da API (`pnpm --filter @super-pdv/api test`) incluem testes de integração que sobem um PostgreSQL temporário via Testcontainers: o Docker precisa estar em execução.

## Admin (`apps/admin`) e Gestor (`apps/gestor`)

```sh
pnpm --filter @super-pdv/admin dev       # http://localhost:3001
pnpm --filter @super-pdv/gestor dev      # http://localhost:3000
pnpm --filter @super-pdv/gestor build
pnpm --filter @super-pdv/gestor test:e2e # Playwright contra o build de produção
```

Na primeira execução dos testes E2E, instale o navegador do Playwright: `pnpm --filter @super-pdv/gestor exec playwright install chromium`.

## PDV (`apps/pdv`)

Aplicativo desktop Electron. O renderer (React) não tem acesso ao Node.js: toda comunicação com o processo principal passa pela API tipada exposta no preload (`window.superPdv`).

```sh
pnpm --filter @super-pdv/pdv dev        # abre a janela com recarga automática
pnpm --filter @super-pdv/pdv build      # build em apps/pdv/out
pnpm --filter @super-pdv/pdv dist       # gera o instalador Windows em apps/pdv/release
pnpm --filter @super-pdv/pdv test       # testes unitários (executados no runtime do Electron)
pnpm --filter @super-pdv/pdv test:e2e   # Playwright contra o app construído
```

O banco local do caixa (SQLite) fica em `%APPDATA%\Super PDV\super-pdv.db`. O instalador (`super-pdv-<versão>-setup.exe`) instala por usuário em `%LOCALAPPDATA%\Programs\super-pdv`; enquanto não houver certificado de assinatura de código, o Windows SmartScreen exibirá um aviso ao executá-lo.

O binário do Electron é baixado no `pnpm install` (script `postinstall` do app). Se ele estiver ausente, execute `pnpm --filter @super-pdv/pdv run postinstall`.

### Módulos nativos

O `better-sqlite3` usa N-API e já traz binários pré-compilados: funciona no Node e no Electron sem recompilação e sem ferramentas de compilação C++. Ao adicionar outro módulo nativo (porta serial, DLL de TEF/SAT), prefira bibliotecas N-API; se for inevitável recompilar para o Electron, será preciso adicionar `@electron/rebuild` e instalar o Visual Studio Build Tools.

### Problemas comuns

- **`TypeError: Cannot read properties of undefined (reading 'whenReady')`** ao rodar `dev`: a variável `ELECTRON_RUN_AS_NODE` está definida no ambiente (alguns hosts, como o processo de extensões do VS Code, a definem) e faz o Electron rodar como Node puro. Remova-a do terminal antes de executar (`Remove-Item Env:ELECTRON_RUN_AS_NODE` no PowerShell ou `unset ELECTRON_RUN_AS_NODE` no bash).

## CI (GitHub Actions)

Workflow em `.github/workflows/ci.yml`:

| Job           | Quando                             | O que faz                                                                                                                                                 |
| ------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify`      | Todo pull request e push na `main` | Lint, checagem de tipos, testes (com PostgreSQL efêmero via Testcontainers) e build **apenas dos pacotes afetados** e seus dependentes; E2E dos apps web. |
| `pdv-windows` | Push na `main` que afete o PDV     | Build, testes unitários e E2E do PDV em Windows; gera o instalador e o publica como artefato da execução (`super-pdv-instalador-windows`).                |

Segredos opcionais do repositório (Settings → Secrets and variables → Actions):

| Segredo            | Uso                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `TURBO_TOKEN`      | Token do Remote Cache do Turborepo (sem ele, o CI usa apenas o cache local do GitHub Actions).                                          |
| `TURBO_TEAM`       | Time/conta do Remote Cache do Turborepo.                                                                                                |
| `CSC_LINK`         | Certificado de assinatura de código (arquivo `.pfx` em base64 ou URL). Sem ele, o instalador sai sem assinatura e o job emite um aviso. |
| `CSC_KEY_PASSWORD` | Senha do certificado de `CSC_LINK`.                                                                                                     |
