# Proposal

## Why

O repositório hoje contém apenas a configuração do OpenSpec. Antes de qualquer funcionalidade de negócio (multi-tenant, ativação do caixa, catálogo, venda), é preciso uma base única onde PDV, painel administrativo e API compartilhem código, configurações e componentes de UI, com um fluxo de desenvolvimento e um CI que garantam qualidade desde o primeiro commit de produto.

## What Changes

- Criar o monorepo Turborepo + pnpm workspaces, com TypeScript strict e Node 24 fixado.
- Criar os três apps vazios, porém executáveis:
  - `apps/pdv`: Electron + React, abrindo uma janela com uma tela inicial composta por componentes de `packages/ui`.
  - `apps/admin`: Next.js, com uma página inicial composta por componentes de `packages/ui`.
  - `apps/api`: NestJS, expondo um endpoint de saúde que informa o estado da API e do banco.
- Criar os pacotes compartilhados:
  - `packages/ui`: shadcn/ui + Tailwind, consumido pelo pdv e pelo admin.
  - `packages/shared`: tipos e schemas zod compartilhados.
  - `packages/db`: Drizzle configurado para PostgreSQL (sem tabelas de negócio ainda).
  - `packages/config`: tsconfig, ESLint e Prettier compartilhados.
- Validar desde já o caminho mais arriscado do PDV: um módulo nativo (SQLite) carregado e empacotado no processo principal do Electron.
- Disponibilizar o PostgreSQL local via Docker Compose e variáveis de ambiente validadas na inicialização.
- Configurar a suíte de testes (Vitest em todo o monorepo, Testcontainers na API, Playwright no admin e no PDV) com ao menos um teste de cada tipo.
- Configurar o CI no GitHub Actions: lint, typecheck, testes e build apenas dos pacotes afetados, com cache do Turborepo; build do instalador do PDV em runner Windows.
- Documentar no README como preparar o ambiente e executar cada app.

## Capabilities

### New Capabilities
- `dev-workspace`: comandos únicos do repositório para instalar, executar, verificar e construir todos os apps e pacotes, incluindo pré-requisitos e configuração de ambiente.
- `ci-pipeline`: verificações automáticas que todo push e pull request precisa passar, e geração do instalador do PDV.
- `api-health`: endpoint público de saúde da API, usado por monitoramento e, futuramente, pelo PDV para detectar conectividade com a nuvem.

### Modified Capabilities
<!-- Nenhuma: não há specs existentes. -->

## Impact

- **Código**: cria `apps/pdv`, `apps/admin`, `apps/api`, `packages/ui`, `packages/shared`, `packages/db`, `packages/config` e os arquivos raiz (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `docker-compose.yml`, `.github/workflows/`, README).
- **Dependências novas**: Turborepo, Electron (+ ferramentas de build/empacotamento), React, Vite, Next.js, NestJS, Tailwind, shadcn/ui, Drizzle, better-sqlite3, zod, Vitest, Testcontainers, Playwright, ESLint, Prettier.
- **Ambiente de desenvolvimento**: passa a exigir Node 24, pnpm (via corepack) e Docker (atualmente não instalado nesta máquina).
- **Infraestrutura**: repositório no GitHub com GitHub Actions; assinatura de código do instalador fica preparada, mas depende de certificado ainda não adquirido.
- **Fora desta mudança**: tabelas de negócio, autenticação, multi-tenant, sincronização, integração com hardware e deploy.
