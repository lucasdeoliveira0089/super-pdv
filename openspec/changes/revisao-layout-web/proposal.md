# Proposal

## Why

O admin e o gestor funcionam, mas com um layout mínimo: login num cartão pequeno, menu lateral fixo sem ícones, cabeçalho sem contexto e tabelas sem ordenação, colunas configuráveis ou paginação. Com o MCP do shadcn configurado, dá para adotar os blocos oficiais (`login-04`, `sidebar-07` e o padrão de data table) e ter, antes de crescer o número de telas, uma base visual consistente que as próximas mudanças apenas reutilizam.

## What Changes

- **Login e telas públicas** (login, esqueci a senha, redefinir senha, troca de senha obrigatória e "Acesso pelo PDV") no estilo `login-04`: cartão em duas colunas com o formulário à esquerda e um painel da marca Super PDV à direita, que some em telas estreitas. Sem login social nem cadastro público (o sistema não tem nenhum dos dois).
- **Casca das páginas autenticadas** no estilo `sidebar-07`:
  - sidebar com ícones, que recolhe para só ícones (botão e atalho Ctrl+B) e vira gaveta no celular;
  - no topo, a identificação do produto e do cliente (gestor) ou da equipe (admin), **apenas informativa**, sem trocar empresa;
  - no rodapé, o usuário logado com menu ("Trocar senha" e "Sair");
  - cabeçalho com botão da sidebar e trilha de navegação (breadcrumb).
- **Tabelas de listagem** no padrão data table: busca, filtros em menus, ordenação por coluna, escolha de colunas visíveis, paginação e contagem de resultados, com estado vazio. A busca e os filtros que a API já oferece (busca de clientes por nome ou CNPJ, filtros de usuários por papel, empresa e situação) continuam sendo feitos na API e ficam no endereço da página.
- **Tema**: cor primária violeta, como na referência, no pacote de UI compartilhado (vale para admin, gestor e PDV), com o modo escuro ajustado.
- Novos componentes no `packages/ui` vindos do registry do shadcn: `avatar`, `breadcrumb`, `collapsible` e o componente de data table (com `@tanstack/react-table`).

## Capabilities

### New Capabilities
- `web-layout`: estrutura visual comum dos apps web (admin e gestor): telas de autenticação, casca com sidebar e trilha de navegação, e padrão das tabelas de listagem.

### Modified Capabilities
<!-- Nenhuma: as regras de acesso, busca e filtros não mudam; o tema continua único em packages/ui (dev-workspace). -->

## Impact

- **`packages/ui`**: tema (`globals.css`) e novos componentes (avatar, breadcrumb, collapsible, data table).
- **`packages/web-session`**: `TelaAutenticacao` e `CascaApp` reescritos; novos componentes de cabeçalho com trilha de navegação e de menu do usuário.
- **`apps/admin` e `apps/gestor`**: layouts e páginas de listagem (clientes, equipe, empresas do cliente, empresas e usuários); os formulários e as regras não mudam.
- **PDV**: só muda a cor primária herdada do tema; telas e fluxo continuam iguais.
- **Testes**: E2E do admin e do gestor ajustados aos novos seletores (menu, filtros, tabelas); sem mudança na API nem no banco.
- **Dependências**: `@tanstack/react-table` em `packages/ui`.
