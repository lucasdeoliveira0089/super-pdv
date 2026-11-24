# Tasks

## 1. Base visual em `packages/ui`

- [x] 1.1 Trocar a cor de destaque para violeta nos tokens do tema (D6), modos claro e escuro; verificar visualmente o botão principal, o foco e o item ativo do menu no admin e no gestor nos dois modos, e que os testes do `packages/ui` e os E2E do PDV seguem passando
- [x] 1.2 Adicionar `avatar`, `breadcrumb` e `collapsible` pelo shadcn (MCP/CLI) no estilo `radix-nova`; verificar com `pnpm --filter @super-pdv/ui typecheck` e lint
- [x] 1.3 Criar o `DataTable` com `@tanstack/react-table` (D4): cabeçalho ordenável, menu "Colunas", paginação de 10 com contagem e estado vazio; verificar com testes de componente (Vitest + Testing Library) de ordenação, ocultar coluna, paginação e mensagem sem resultados

## 2. Layout compartilhado em `packages/web-session`

- [x] 2.1 Reescrever `TelaAutenticacao` no estilo `login-04` com o painel da marca (D5), sem login social nem cadastro; verificar visualmente as telas de login, esqueci/redefinir senha, troca de senha e "Acesso pelo PDV" em 1280 px e 390 px
- [x] 2.2 Reescrever `CascaApp` no estilo `sidebar-07`: itens com ícone por chave (D2), topo com produto e contexto, rodapé com `MenuUsuario` ("Trocar senha" e "Sair"), recolhimento com Ctrl+B e estado pelo cookie `sidebar_state` (D7); verificar com o gestor e o admin em dev, recolhendo, navegando e reabrindo
- [x] 2.3 Criar o `CabecalhoApp` com botão do menu e trilha de navegação derivada do endereço (D3); verificar com teste unitário da função de caminho para etapas (lista, novo, detalhe, editar, empresas do cliente)
- [x] 2.4 Criar a `BarraFiltros` (busca com debounce, filtros em menu e "Limpar filtros") sincronizada com a URL (D4); verificar com teste de componente de que a busca e os filtros atualizam e limpam os parâmetros do endereço

## 3. Admin

- [x] 3.1 Aplicar a nova casca no layout do admin (contexto "Equipe Super PDV", itens Clientes e Equipe com ícones, `defaultOpen` pelo cookie); verificar abrindo cada página interna em dev
- [x] 3.2 Migrar as listas de clientes (busca na API por nome ou CNPJ), equipe e empresas do cliente para `DataTable` + `BarraFiltros`, e reescrever os E2E do admin para os novos seletores; verificar com `pnpm --filter @super-pdv/admin test:e2e`

## 4. Gestor

- [x] 4.1 Aplicar a nova casca no layout do gestor (nome do cliente no topo, itens por permissão com ícones) e na tela "Acesso pelo PDV"; verificar em dev com Dono, Gerente e Operador do `seed:dev`
- [x] 4.2 Migrar as listas de empresas e usuários (filtros de papel, empresa e situação na API) para `DataTable` + `BarraFiltros`, e reescrever os E2E do gestor para os novos seletores; verificar com `pnpm --filter @super-pdv/gestor test:e2e`
- [x] 4.3 Escrever os E2E da spec `web-layout` no gestor: painel da marca em 1280 px e oculto em 390 px, Ctrl+B, menu móvel, menu do usuário com "Sair", trilha em página de detalhe, ordenar, esconder coluna, paginar com 15 usuários criados pelo teste e filtro na URL com "Limpar filtros"; verificar com `pnpm --filter @super-pdv/gestor test:e2e`

## 5. Integração

- [x] 5.1 Atualizar o README (visão geral do layout e onde ficam os componentes de layout e o `DataTable`); verificar seguindo o texto num checkout limpo
- [x] 5.2 Executar `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm format:check` e `openspec validate revisao-layout-web --strict`; verificar sucesso local e o CI verde no PR
