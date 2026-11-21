# Tasks

## 1. Pré-requisitos e raiz do monorepo

- [x] 1.1 (Manual — pessoa desenvolvedora) Instalar Docker Desktop e confirmar com `docker compose version`
- [x] 1.2 Criar `package.json` raiz (privado, `packageManager` pnpm 12, TypeScript 6.0.x, `engines.node` 24), `.nvmrc` e `pnpm-workspace.yaml` (`apps/*`, `packages/*`, `engineStrict`, `allowBuilds`); verificar que `corepack pnpm install` conclui sem erros
- [x] 1.3 Adicionar Turborepo e `turbo.json` com as tasks `build`, `dev`, `lint`, `typecheck`, `test`, `test:e2e` conforme D4, e scripts raiz correspondentes; verificar com `pnpm turbo run build --dry-run`
- [x] 1.4 Criar `.gitignore` (node_modules, dist, .next, out, .turbo, `.env*` exceto `.env.example`, artefatos do electron-builder) e `.editorconfig`; verificar com `git check-ignore apps/api/.env` retornando o caminho
- [x] 1.5 Criar `README.md` com pré-requisitos (Node 24, corepack, Docker) e o comando de instalação; verificar que os comandos citados executam

## 2. packages/config

- [x] 2.1 Criar `@super-pdv/config` com `tsconfig` base (strict) e variantes `node`, `react-library`, `vite-react`, `nextjs`; verificar com `tsc --showConfig` em um app de teste
- [x] 2.2 Adicionar ESLint flat config compartilhado (base TS, react, next) e Prettier na raiz com `prettier-plugin-tailwindcss`, scripts `lint`, `format` e `format:check`; verificar que `pnpm lint` e `pnpm format:check` passam

## 3. packages/shared

- [x] 3.1 Criar `@super-pdv/shared` compilado com tsup (ESM + CJS + d.ts), com zod e um schema de exemplo (`healthResponseSchema`) usado pela API; verificar com teste Vitest que valida e rejeita payloads e com `pnpm --filter @super-pdv/shared build` gerando `dist/`

## 4. packages/ui (shadcn/ui)

- [x] 4.1 Criar `@super-pdv/ui` como pacote de código-fonte com Tailwind v4, `globals.css` (tokens claro/escuro, `@source`), `lib/utils` (`cn`) e `components.json` do layout monorepo do shadcn; verificar `pnpm --filter @super-pdv/ui typecheck`
- [x] 4.2 Adicionar os componentes `button`, `card` e `badge` via CLI do shadcn; verificar que os arquivos foram gravados em `packages/ui/src/components` e que um teste Vitest + Testing Library renderiza o `Button`

## 5. packages/db e banco local

- [x] 5.1 Criar `docker-compose.yml` (postgres:18, volume nomeado, healthcheck) e `.env.example` raiz; adicionar scripts `db:up`/`db:down`; verificar que `pnpm db:up` sobe o banco e que os dados persistem após `db:down` + `db:up`
- [x] 5.2 Criar `@super-pdv/db` compilado com tsup, Drizzle + `pg`, `createDb(url)`, schema vazio, `drizzle.config.ts` e scripts `db:generate`/`db:migrate` expostos na raiz; verificar que `pnpm db:migrate` executa sem erro contra o banco local
- [x] 5.3 Documentar no README os comandos de banco local e migrations; verificar seguindo os passos escritos

## 6. apps/api (NestJS)

- [x] 6.1 Criar `@super-pdv/api` com NestJS, builder SWC, porta 3333 e scripts `dev`/`build`/`start`; verificar que `pnpm --filter @super-pdv/api dev` inicia
- [x] 6.2 Implementar validação de ambiente com zod (`DATABASE_URL`, `PORT`, `NODE_ENV`) e `apps/api/.env.example`; verificar com teste Vitest que a inicialização falha nomeando a variável ausente
- [x] 6.3 Implementar `GET /health/live` e `GET /health/ready` com Terminus e indicador Drizzle (timeout 2 s, erros sanitizados) usando `healthResponseSchema`; verificar com testes de integração (Vitest + Testcontainers + supertest) cobrindo: live 200, ready 200 com banco ativo, ready 503 com container parado, live 200 com banco parado, e ausência de host/usuário/mensagem do driver na resposta
- [x] 6.4 Documentar no README como executar a API e os endpoints de saúde; verificar com `curl` nos dois endpoints

## 7. apps/admin (Next.js)

- [x] 7.1 Criar `@super-pdv/admin` com Next.js App Router, porta 3000, `transpilePackages` para `@super-pdv/ui`, importação do `globals.css` e `components.json` apontando para o pacote de UI; verificar que `pnpm --filter @super-pdv/admin build` conclui
- [x] 7.2 Criar página inicial com `Card`, `Badge` e `Button` do pacote de UI; verificar com teste E2E Playwright (contra `next start`) que os componentes são exibidos com as classes do tema
- [x] 7.3 Verificar o fluxo "novo componente": executar `shadcn add` dentro de `apps/admin` e confirmar que o arquivo é criado em `packages/ui` (reverter o componente de teste depois)

## 8. apps/pdv (Electron)

- [x] 8.1 Criar `@super-pdv/pdv` com electron-vite (main/preload/renderer React), janela com `contextIsolation`, `sandbox` e `nodeIntegration: false`, e `components.json` apontando para o pacote de UI; verificar que `pnpm --filter @super-pdv/pdv dev` abre a janela
- [x] 8.2 Criar tela inicial com componentes do pacote de UI; verificar que alterar o `Button` em `packages/ui` atualiza o PDV e o admin em execução sem reinício manual
- [x] 8.3 Adicionar `better-sqlite3` + Drizzle no main process (banco em `userData`, consulta `sqlite_version()`), API tipada no preload via `contextBridge` e indicador "Banco local: operante" na tela; configurar `external` do módulo nativo (N-API, sem recompilação); verificar com teste Vitest do módulo de banco executado no runtime do Electron e visualmente em dev
- [x] 8.4 Configurar electron-builder (NSIS, Windows) e script `dist`; verificar instalando o instalador gerado localmente e confirmando o arquivo do banco em `%APPDATA%` e o indicador operante
- [x] 8.5 Adicionar teste E2E Playwright `_electron` que abre o app construído e verifica a janela, o componente de UI e o indicador do banco local; verificar com `pnpm --filter @super-pdv/pdv test:e2e`
- [x] 8.6 Documentar no README como executar o PDV, gerar o instalador e a política para módulos nativos; verificar seguindo os passos escritos

## 9. CI (GitHub Actions)

- [x] 9.1 Criar `.github/workflows/ci.yml` (PR e push em `main`, Ubuntu): pnpm via corepack com cache, `turbo run lint typecheck test build --affected`, E2E do admin, cache de `.turbo/` e Remote Cache opcional via segredos; verificar com `actionlint` e, após publicar no GitHub, com um PR verde
- [x] 9.2 Adicionar job `pdv-windows` (push em `main` quando o PDV for afetado): build, E2E do PDV com trace em falha, `electron-builder --win`, assinatura condicional via `CSC_LINK`/`CSC_KEY_PASSWORD` com `::warning::` quando ausente e upload do instalador; verificar com `actionlint` e com uma execução em `main` gerando o artefato
- [x] 9.3 Documentar no README os workflows, segredos opcionais (`TURBO_TOKEN`, `TURBO_TEAM`, `CSC_LINK`, `CSC_KEY_PASSWORD`); verificar que os nomes coincidem com os usados nos workflows

## 10. Verificação integrada

- [x] 10.1 Em clone limpo: `corepack pnpm install` → `pnpm db:up` → `pnpm db:migrate` → `pnpm dev`; verificar API (`/health/ready` 200), admin no navegador e janela do PDV simultaneamente
- [x] 10.2 Executar `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` na raiz e verificar sucesso; introduzir um erro de tipo proposital em `packages/shared` e verificar que `pnpm typecheck` falha apontando o arquivo (reverter em seguida)
- [x] 10.3 Rodar `openspec validate estrutura-monorepo --strict` e verificar ausência de erros

## Workflow follow-up

- Criar o repositório no GitHub e enviar o código para que as verificações 9.1 e 9.2 possam ser concluídas.
- Arquivar a mudança (`/openspec-archive-change`) após revisão e CI verde.
