# Tasks

## 1. Reorganização dos apps

- [x] 1.1 Renomear `apps/admin` para `apps/gestor` (pacote `@super-pdv/gestor`, porta 3000) e atualizar CI, README, `.prettierignore`/configs e testes E2E; verificar com `pnpm lint typecheck test build test:e2e` verdes e nenhuma referência restante a `@super-pdv/admin` antigo
- [x] 1.2 Criar o novo `apps/admin` (`@super-pdv/admin`, Next.js, porta 3001) consumindo `packages/ui`, com página provisória e E2E básico; verificar com `pnpm --filter @super-pdv/admin build test:e2e` e `pnpm dev` subindo admin, gestor, API e PDV juntos

## 2. Contratos compartilhados (`packages/shared`)

- [x] 2.1 Implementar validação, normalização e máscara de CNPJ numérico e alfanumérico (D7) e `cnpjSchema`; verificar com testes Vitest cobrindo `11.222.333/0001-81`, `12.ABC.345/01DE-35`, `11.222.333/0001-82`, sequências repetidas e formato inválido
- [x] 2.2 Definir papéis, `PERMISSOES`, `PERMISSOES_POR_PAPEL` e `temPermissao` (D5); verificar com teste tabelado que reproduz a matriz da spec `access-control`
- [x] 2.3 Criar schemas zod de contratos (auth dos dois domínios, política de senha, `me`, empresas, usuários, clientes, equipe, erro da API); verificar com testes que aceitam e rejeitam payloads representativos

## 3. Banco de dados (`packages/db`)

- [x] 3.1 Modelar no Drizzle as tabelas, enum, índices, `CHECK`s e FKs compostas (D2); gerar a migration e verificar com `pnpm db:migrate` no banco local
- [x] 3.2 Adicionar à migration o papel `superpdv_app`, grants e políticas RLS (D3); verificar com testes de integração como `superpdv_app`: com contexto vê só o próprio cliente, sem contexto nada, escrita com `tenant_id` alheio rejeitada
- [x] 3.3 Adicionar o teste de catálogo que falha se alguma tabela com `tenant_id` não tiver RLS e política; verificar que passa e que falha ao remover temporariamente uma política
- [x] 3.4 Adicionar o Mailpit ao `docker-compose.yml`; verificar com `pnpm db:up` e a interface em `http://localhost:8025`

## 4. Infraestrutura da API

- [x] 4.1 Estender o `envSchema` (`JWT_SECRET`, `GESTOR_URL`, `ADMIN_URL`, `SMTP_URL`, `MAIL_FROM`) e o `.env.example`; verificar com testes de `validateEnv`
- [x] 4.2 Implementar `nestjs-cls`, `TenantDb` e `SystemDb` restrito (D3); verificar com teste de isolamento do `TenantDb` e teste que falha se módulo não autorizado injetar `SystemDb`
- [x] 4.3 Implementar `ZodValidationPipe`, filtro de exceções `{ statusCode, code, message, fieldErrors? }` e prefixo `/v1` mantendo `/health/*`; verificar com testes de integração
- [x] 4.4 Implementar `Mailer` SMTP e em memória; verificar com teste de integração enviando a um Mailpit (Testcontainers) e lendo pela API dele

## 5. Núcleo de autenticação e clientes (`user-auth`)

- [x] 5.1 Implementar o `AuthCore` (argon2id, política e geração de senha, sessões, tokens com audiência, comparação em tempo constante) (D4); verificar com testes unitários
- [x] 5.2 Implementar `POST /v1/auth/login` e o guard de clientes que recarrega usuário, cliente e sessão a cada requisição, e `GET /v1/me`; verificar com testes: sucesso, e-mail em maiúsculas, 401 genérico (senha errada, e-mail inexistente, desativado, cliente suspenso), token expirado/adulterado, `me` com papel, permissões e empresas ativas
- [x] 5.3 Implementar refresh com rotação, reuso (revoga sessão), expiração de 30 dias e logout; verificar com testes dos cenários da spec
- [x] 5.4 Implementar guard de senha temporária (403 `PASSWORD_CHANGE_REQUIRED`) e troca de senha encerrando outras sessões; verificar com testes
- [x] 5.5 Implementar bloqueio por e-mail e limite por IP; verificar com testes (6ª tentativa → 429 com senha correta, liberação após 15 min com relógio controlado, zeragem após sucesso)
- [x] 5.6 Implementar recuperação de senha (202 sempre, link para `GESTOR_URL`, 1 h, uso único, revoga sessões); verificar com testes usando o `Mailer` em memória

## 6. Equipe Super PDV (`platform-team`)

- [x] 6.1 Implementar o domínio `equipe` no `AuthCore` (`/v1/admin/auth/*`, `/v1/admin/me`, recuperação para `ADMIN_URL`); verificar com testes de login, senha temporária, bloqueio e recuperação da equipe
- [x] 6.2 Verificar a separação dos domínios: Dono no login da equipe → 401 genérico, token da equipe em rota de cliente → 401 e vice-versa
- [x] 6.3 Implementar a gestão da equipe (`/v1/admin/equipe`: listar, criar com senha temporária, desativar/reativar, redefinir senha; não desativar a si mesmo; ao menos um membro ativo); verificar com testes
- [x] 6.4 Implementar o comando `equipe:criar`; verificar com teste de integração (sucesso e e-mail repetido)

## 7. Autorização (`access-control`)

- [x] 7.1 Implementar `@RequerPermissao` e o guard de permissões; verificar com teste tabelado papel × rota → status (Operador 403 nas rotas do gestor)
- [x] 7.2 Implementar o escopo por empresa para Gerente e Operador; verificar com os cenários "Listagem de usuários do Gerente" e "Operação em empresa não atribuída"

## 8. Clientes e empresas no admin (API) (`client-provisioning`, `organization-structure`)

- [x] 8.1 Implementar `/v1/admin/clientes` (criar cliente + 1ª empresa + Dono numa transação, listar/buscar por nome e CNPJ, detalhar, suspender/reativar); verificar com testes: sucesso com senha temporária, falha sem resíduos, e-mail repetido, busca por CNPJ, suspensão derrubando login e tokens
- [x] 8.2 Implementar `POST /v1/admin/clientes/:id/empresas` e `PATCH /v1/admin/empresas/:id` (CNPJ único global e imutável, inativar/reativar); verificar com testes dos cenários da spec
- [x] 8.3 Implementar `POST /v1/admin/usuarios/:id/redefinir-senha` restrito a Donos; verificar com teste do cenário "Dono sem acesso"

## 9. Gestor (API) (`organization-structure`, `user-management`, `tenant-isolation`)

- [x] 9.1 Implementar `GET /v1/empresas` e `GET /v1/empresas/:id` (escopo por papel) e garantir que usuários de clientes não criam nem alteram empresas (403); verificar com testes
- [x] 9.2 Implementar `/v1/usuarios` (listar com filtros, detalhar, criar com senha temporária, alterar nome/papel/empresas, desativar/reativar encerrando sessões, redefinir senha); verificar com testes dos cenários da spec
- [x] 9.3 Implementar as regras do Dono, último Dono, não desativar a si mesmo, Gerente limitado a Operadores das suas empresas e mudanças imediatas; verificar com testes de cada regra
- [x] 9.4 Verificar o isolamento HTTP entre dois clientes: listagens separadas, `GET`/`PATCH` de registro alheio → 404 sem alteração e `tenant_id` no corpo ignorado

## 10. Dados de demonstração e documentação

- [x] 10.1 Implementar o comando `seed:dev` (membro da equipe, cliente "Demonstração" com duas empresas, um usuário de cada papel; recusa produção); verificar executando no banco local e fazendo login de cada usuário via `curl`
- [x] 10.2 Documentar no README os três apps e portas, o bootstrap da equipe, o seed, o Mailpit e as novas variáveis; verificar seguindo os passos escritos

## 11. Sessão web e componentes (`packages/web-session`, `packages/ui`)

- [x] 11.1 Adicionar ao `packages/ui` os componentes shadcn de D9; verificar com typecheck/lint e um teste de renderização do formulário base
- [x] 11.2 Criar `packages/web-session` (cliente da API no servidor com renovação em 401, cookies `httpOnly`/`SameSite=Lax`, fábrica do `proxy.ts`, Server Actions de login/logout/troca de senha/recuperação) parametrizado por app; verificar com testes unitários (renovação, atributos dos cookies, redirecionamento com `next`)

## 12. Admin (UI)

- [x] 12.1 Implementar no admin as telas de login, troca de senha, esqueci/redefinir senha e o layout autenticado; verificar com E2E: login da equipe, redirecionamento de volta, troca obrigatória e Dono recusado no admin
- [x] 12.2 Implementar clientes (busca, novo cliente com 1ª empresa e Dono e senha exibida uma vez, detalhe com empresas e Donos, suspender/reativar, redefinir senha do Dono) e o formulário de empresa; verificar com E2E: cadastro de cliente, CNPJ inválido com erro no campo, nova empresa e suspensão
- [x] 12.3 Implementar a tela da equipe (listar, cadastrar, desativar/reativar, redefinir senha); verificar com E2E de cadastro de membro

## 13. Gestor (UI)

- [x] 13.1 Implementar no gestor login, troca de senha, esqueci/redefinir senha, layout com menu por permissão, `/acesso-negado` e aviso ao Operador; verificar com E2E: login, troca obrigatória, recuperação lendo o e-mail pela API do Mailpit, acesso negado do Gerente, Operador bloqueado e logout
- [x] 13.2 Implementar `/empresas` (somente leitura, CNPJ mascarado, escopo do Gerente); verificar com E2E do Gerente vendo apenas as suas empresas
- [x] 13.3 Implementar `/usuarios` (listagem e filtros, criação com senha exibida uma vez, edição de papel/empresas, desativar/reativar, redefinir senha) oferecendo só papéis e empresas permitidos; verificar com E2E: Gerente só vê "Operador de caixa" e as próprias empresas e o novo usuário precisa trocar a senha

## 14. CI e verificação integrada

- [x] 14.1 Atualizar o workflow (Postgres + Mailpit via `docker compose`, migrations e `seed:dev` antes dos E2E de admin e gestor; filtros com `@super-pdv/gestor`); verificar com `actionlint` e com o PR desta mudança verde
- [x] 14.2 Executar `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm format:check` na raiz e verificar sucesso
- [x] 14.3 Rodar `openspec validate multi-tenant-e-autenticacao --strict` e verificar ausência de erros

## Workflow follow-up

- Abrir o PR desta mudança e fazer o merge após CI verde.
- Seguir com a mudança `login-no-pdv`.
- Arquivar a mudança (`/openspec-archive-change`).
