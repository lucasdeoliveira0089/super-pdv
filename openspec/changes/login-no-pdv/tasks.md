# Tasks

## 1. Processo principal

- [ ] 1.1 Adicionar a configuração `MAIN_VITE_API_URL`/`MAIN_VITE_GESTOR_URL` validada com zod e `.env.example` do PDV; verificar com teste unitário de valores ausentes e inválidos
- [ ] 1.2 Implementar o `SessionStore` com `safeStorage` (D1); verificar com testes Vitest no runtime do Electron: arquivo cifrado sem o token legível, leitura após reinício simulado e nenhuma gravação quando a criptografia não está disponível
- [ ] 1.3 Implementar o `ApiClient` com validação por schemas, renovação única em 401 e mapeamento de erros para códigos (D1, D2); verificar com testes contra um servidor HTTP local
- [ ] 1.4 Implementar os canais IPC e a API do preload (D2) e a inicialização da sessão (D4); verificar com testes de que nenhuma resposta IPC contém tokens e de cada caminho da inicialização

## 2. Interface do PDV

- [ ] 2.1 Implementar a máquina de estados e as telas de login (com "Esqueci minha senha") e troca de senha, operáveis pelo teclado; verificar visualmente em dev contra a API local com o `seed:dev`
- [ ] 2.2 Implementar a escolha de empresa e a tela principal (nome fantasia, CNPJ mascarado, indicador do banco local, "Trocar empresa", "Sair"); verificar visualmente em dev com usuários de uma e de várias empresas

## 3. Testes E2E

- [ ] 3.1 Criar o servidor simulado da API validado pelos schemas de `packages/shared`, com teste de contrato; verificar com `pnpm --filter @super-pdv/pdv test`
- [ ] 3.2 Escrever os E2E Playwright do PDV cobrindo os cenários da spec `pdv-session` (teclado, credenciais inválidas, sem conexão, troca de senha, uma/várias/nenhuma empresa, reabrir com sessão, sessão recusada, sair, interface sem tokens, esqueci minha senha); verificar com `pnpm --filter @super-pdv/pdv test:e2e`

## 4. Documentação e verificação

- [ ] 4.1 Documentar no README a configuração das URLs no PDV e o fluxo de login; verificar seguindo os passos
- [ ] 4.2 Executar `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm format:check` e `openspec validate login-no-pdv --strict`; verificar sucesso e o job Windows do CI verde no PR

## Workflow follow-up

- Abrir o PR desta mudança e fazer o merge após CI verde (inclui o job do instalador do PDV na `main`).
- Arquivar a mudança (`/openspec-archive-change`).
