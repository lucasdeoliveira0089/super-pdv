# Design

## Context

Repositório greenfield: existe apenas a configuração do OpenSpec. A stack já está decidida (ver `openspec/config.yaml`); este design fixa **como** os pedaços se conectam. Ambiente atual da máquina de desenvolvimento: Windows 11, Node 24, pnpm 9 global, corepack disponível, **Docker não instalado**, GitHub CLI não instalado.

Restrições que moldam o design:
- PDV, admin e API em TypeScript, compartilhando código via `packages/`.
- O PDV usará módulos nativos (SQLite agora; serial/DLL depois). Isso é o maior risco técnico do monorepo e deve ser validado nesta mudança.
- NestJS é, na prática, CommonJS; Vite e Next são ESM. Os pacotes compartilhados precisam servir aos dois mundos.

## Goals / Non-Goals

**Goals:**
- Os três apps rodando juntos com um comando, consumindo `packages/ui`, `packages/shared` e `packages/db`.
- Pipeline do módulo nativo no Electron (dev + instalador) comprovada.
- Suíte de testes de cada tipo funcionando com pelo menos um teste real.
- CI verde e incremental desde o primeiro PR.

**Non-Goals:**
- Tabelas de negócio, autenticação, multi-tenant/RLS, sincronização, hardware, telas reais.
- Deploy da API/admin e publicação de atualizações automáticas do PDV.
- Comunicação PDV ↔ API (fica para `ativacao-do-caixa`).

## Decisions

### D1. Nomes e layout
Escopo npm `@super-pdv/*`. Layout:

```
apps/pdv          @super-pdv/pdv      Electron + React (Vite)
apps/admin        @super-pdv/admin    Next.js (App Router)
apps/api          @super-pdv/api      NestJS
packages/ui       @super-pdv/ui       shadcn/ui + Tailwind
packages/shared   @super-pdv/shared   tipos + schemas zod
packages/db       @super-pdv/db       Drizzle (Postgres)
packages/config   @super-pdv/config   tsconfig, eslint, prettier
```
Portas de dev: API `3333`, admin `3000`, renderer do PDV `5173`.

### D2. Versões fixadas
- Node 24 via `.nvmrc` + `engines` + `engine-strict=true` no `.npmrc` (atende ao cenário de versão incompatível).
- pnpm 12 (estável atual) via campo `packageManager` + corepack (a máquina tem pnpm 9 global; corepack resolve a versão do projeto).
- TypeScript fixado em **6.0.x**, não na 7.x: typescript-eslint suporta até `<6.1` e o NestJS CLI usa `~6.0`. Reavaliar quando o ecossistema suportar a 7.
- Demais dependências: versão estável mais recente no momento da implementação, com lockfile versionado.
- pnpm 12 lê do `.npmrc` apenas auth/registry: `engineStrict` e `allowBuilds` ficam no `pnpm-workspace.yaml`. Scripts de instalação são bloqueados por padrão → listar explicitamente em `allowBuilds` (electron, better-sqlite3, esbuild, @swc/core e afins).

### D3. Estratégia de build dos pacotes internos
- `packages/ui`: **pacote de código-fonte** (exports apontam para `.tsx`). Vite e Next (`transpilePackages`) compilam junto com o app; recarga automática sem build intermediário. Só é consumido por apps com bundler, então não precisa de build próprio.
- `packages/shared` e `packages/db`: **pacotes compilados** com tsup, saída ESM + CJS + `.d.ts`. Motivo: a API (CJS, executada por Node) não consegue importar `.ts` de workspace de forma confiável. Em dev, `tsup --watch` mantém o `dist` atualizado e o Turborepo ordena via `dependsOn: ["^build"]`.
- Alternativa descartada: tudo como código-fonte com path aliases do TS — quebra em runtime na API e no main process do Electron.

### D4. Turborepo
Tasks em `turbo.json`: `build` (dependsOn `^build`, outputs `dist/**`, `.next/**`, `out/**`), `dev` (persistent, sem cache), `lint`, `typecheck` (dependsOn `^build` para ter `.d.ts`), `test`, `test:e2e`. Variáveis de ambiente relevantes declaradas em `env` para não contaminar o cache.

### D5. UI compartilhada (shadcn/ui)
- Layout de monorepo oficial do shadcn: `packages/ui/components.json` + `components.json` em cada app apontando os aliases `ui`/`utils` para `@super-pdv/ui`. Assim `shadcn add` executado em um app grava o componente em `packages/ui` (requisito "novo componente adicionado ao pacote").
- Primitivas Radix; Tailwind v4 (config em CSS). `packages/ui/src/styles/globals.css` define os tokens do tema (claro/escuro) e usa `@source` para incluir os componentes do pacote; cada app importa esse CSS.
- Componentes iniciais: `button`, `card`, `badge` — suficientes para as telas iniciais e para o teste.

### D6. PDV (Electron)
- **electron-vite** (main/preload/renderer com Vite) + **electron-builder** (instalador NSIS para Windows). electron-builder escolhido por ser o caminho natural para `electron-updater` no futuro. Alternativa: Electron Forge — descartada por integração menos direta com o updater e com monorepo pnpm.
- Segurança desde o início: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; o renderer só acessa o processo principal por uma API tipada exposta no preload via `contextBridge` e IPC.
- Banco local: `better-sqlite3` + `drizzle-orm/better-sqlite3` no main process, arquivo em `app.getPath('userData')`. Nesta mudança apenas abre o banco e consulta `sqlite_version()`; a tela inicial exibe "Banco local: operante (SQLite x.y)". Módulo nativo marcado como `external` no bundle do main. O better-sqlite3 (13+) usa N-API e publica binários pré-compilados por plataforma: o mesmo binário carrega no Node e no Electron, sem recompilação por ABI nem toolchain C++. Os testes do módulo de banco rodam no runtime do Electron (`ELECTRON_RUN_AS_NODE`) para reproduzir a produção.

### D7. Admin (Next.js)
App Router, Turbopack em dev, `transpilePackages: ["@super-pdv/ui"]`. Página inicial com componentes de `packages/ui`. Sem autenticação nem chamadas à API nesta mudança.

### D8. API (NestJS)
- Builder SWC (compilação rápida, necessário para decorators no Vitest).
- Configuração: `@nestjs/config` com validação por schema zod; a API recusa iniciar com variável ausente/inválida (`DATABASE_URL`, `PORT`, `NODE_ENV`).
- Saúde com `@nestjs/terminus`: `GET /health/live` (sem dependências) e `GET /health/ready` (indicador customizado que executa `select 1` via Drizzle com timeout de 2 s). Erros do driver são registrados no log e **substituídos** por `{ status: "down" }` na resposta (spec `api-health`, sem exposição de dados). Endpoints fora de qualquer prefixo/versão e sem guard de autenticação.

### D9. Banco (packages/db)
Drizzle com driver `pg` (node-postgres, Pool). Exporta `createDb(url)` e o schema (vazio por enquanto). `drizzle-kit` com pasta `migrations/` no próprio pacote; scripts `db:generate` e `db:migrate` expostos na raiz. Schemas SQLite do PDV ficam no PDV até a mudança de sincronização definir o que é compartilhado.

PostgreSQL local via `docker-compose.yml` na raiz: imagem `postgres:18`, volume nomeado (persistência), credenciais vindas de `.env.example`. O mesmo major é usado no Testcontainers para paridade.

### D10. Testes
- **Vitest** por pacote (config própria), orquestrado pelo Turborepo. API com `unplugin-swc` para metadata de decorators.
- **Integração da API**: Testcontainers sobe `postgres:18`, a app Nest é iniciada contra ele e os endpoints de saúde são testados via supertest — inclusive o cenário de banco parado (container interrompido) para o 503.
- **E2E admin**: Playwright contra o build de produção (`next start`).
- **E2E PDV**: Playwright `_electron` contra o app construído, verificando janela, componente de UI e indicador do banco local.
- `test` (unit + integração) e `test:e2e` são tasks separadas para permitir rodar rápido localmente.

### D11. Qualidade
ESLint flat config exportado por `@super-pdv/config` (base TS + presets react e next), Prettier na raiz com `prettier-plugin-tailwindcss`. `.editorconfig` e o `.gitattributes` já existente garantem LF.

### D12. CI (GitHub Actions)
- `ci.yml` em `pull_request` e `push` para `main`, job Ubuntu: checkout com histórico completo → corepack/pnpm com cache do store → `turbo run lint typecheck test build --affected` → `test:e2e` do admin. Docker nativo do runner atende o Testcontainers.
- Cache do Turborepo: `actions/cache` sobre `.turbo/` por padrão; Remote Cache passa a ser usado automaticamente se `TURBO_TOKEN`/`TURBO_TEAM` existirem nos segredos.
- Job `pdv-windows` (runner Windows) em `push` para `main` quando o PDV for afetado (`turbo-ignore`/`--affected`): build, E2E do PDV, `electron-builder --win` e upload do instalador como artefato. Assinatura via `CSC_LINK`/`CSC_KEY_PASSWORD` se presentes; caso contrário, gera sem assinatura e emite `::warning::`.

## Risks / Trade-offs

- [electron-builder não coleta dependências corretamente com o layout isolado do pnpm] → bundle do main inclui todas as deps JS (só o módulo nativo fica externo); se ainda falhar, usar `node-linker=hoisted` restrito via `.npmrc` + `pnpm-workspace` ou `dependenciesMeta`, documentando a escolha.
- [Futuros módulos nativos (serial, DLL/FFI) sem binários N-API exigirem recompilação por ABI do Electron] → avaliar caso a caso; preferir bibliotecas N-API (ex.: koffi) e, se inevitável, adicionar `@electron/rebuild` + Visual Studio Build Tools e documentar.
- [Pacotes compilados (shared/db) deixam o dev mais lento que pacotes de código-fonte] → `tsup --watch` em paralelo pelo Turborepo; reavaliar se a API migrar para ESM.
- [Docker ausente na máquina atual] → pré-requisito explícito na tarefa 1; sem Docker, testes de integração e banco local não rodam (os demais sim).
- [Instalador sem assinatura dispara SmartScreen] → aceitável até haver clientes; certificado é decisão comercial posterior.
- [E2E do Electron instável no CI] → executar apenas no runner Windows, com retries do Playwright e trace salvo como artefato em caso de falha.

## Migration Plan

Greenfield: não há migração. Rollback = reverter o merge.

## Open Questions

- Certificado de assinatura de código (EV ou OV, fornecedor): decisão comercial, não muda o pipeline.
- Provedor de Remote Cache do Turborepo (Vercel ou self-hosted): o CI funciona com cache local até lá.
