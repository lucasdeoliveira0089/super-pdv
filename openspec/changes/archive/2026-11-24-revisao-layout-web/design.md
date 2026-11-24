# Design

## Context

- Admin e gestor compartilham as telas de autenticação e a casca autenticada via `packages/web-session/src/telas.tsx` (`TelaAutenticacao`, `CascaApp`, `CabecalhoPagina`). Os layouts dos apps são Server Components que montam a lista de itens do menu a partir das permissões e passam para `CascaApp` (Client Component).
- `packages/ui` já tem `sidebar` (com atalho Ctrl+B e cookie `sidebar_state`), `dropdown-menu`, `table`, `checkbox`, `separator`, `sheet`, `tooltip` e `skeleton`. Faltam `avatar`, `breadcrumb` e `collapsible`. O estilo é `radix-nova` e o MCP do shadcn está disponível para consultar os blocos `login-04`, `sidebar-07` e o exemplo `data-table-demo`.
- Listagens atuais: clientes (busca na API por `?busca=`), equipe e empresas do cliente no admin; empresas e usuários (filtros na API por `papel`, `empresaId` e `ativo`) no gestor. As listas são pequenas e vêm inteiras da API.
- Os E2E usam seletores atuais (`link` do menu, botão "Filtrar", rótulo "Buscar por nome ou CNPJ", `tbody tr td:nth-child(3)`).

## Goals / Non-Goals

**Goals:**
- Um único conjunto de componentes de layout em `packages/web-session` e `packages/ui`, usado pelos dois apps.
- Toda listagem atual migrada para o componente de data table, sem mudar o que cada perfil vê.

**Non-Goals:**
- Paginação, ordenação ou busca no servidor para listas grandes (as APIs atuais devolvem a lista inteira).
- Seletor de empresa ativa no gestor, alternador de tema claro/escuro na interface e mudanças no PDV além da cor herdada.
- Novas páginas ou ações (ex.: dashboard); formulários mantêm campos e comportamento.

## Decisions

### D1. Blocos do shadcn adaptados, não copiados por app
Os blocos `login-04` e `sidebar-07` são adicionados pelo MCP/CLI como referência e reescritos como componentes do `packages/web-session` (`TelaAutenticacao`, `CascaApp`, `MenuUsuario`, `CabecalhoApp`). Assim admin e gestor continuam sem código de layout próprio. Alternativa descartada: instalar os blocos em cada app (duplicaria o layout e violaria a regra de UI compartilhada).

### D2. Ícones por chave, não por componente
Os layouts são Server Components e não podem passar componentes React (ícones) para `CascaApp`. Cada item do menu informa `icone: "clientes" | "equipe" | "empresas" | "usuarios" | ...`, e `web-session` mapeia a chave para o ícone `lucide-react`. Alternativa descartada: transformar os layouts em Client Components (perderia a leitura da sessão no servidor).

### D3. Trilha de navegação derivada do endereço
`CabecalhoApp` (cliente) monta a trilha a partir de `usePathname()`: o primeiro segmento usa o rótulo do item de menu; segmentos fixos conhecidos viram rótulos (`novo` → "Novo", `editar` → "Editar", `empresas/nova` → "Nova empresa"); identificadores viram "Detalhes". Cada app pode sobrescrever rótulos por um mapa simples. Alternativa descartada: cada página informar a trilha (exigiria contexto compartilhado entre Server Components e repetição em todas as páginas).

### D4. Data table: ordenação, colunas e paginação no navegador; busca e filtros na API
Novo componente `DataTable` em `packages/ui` (TanStack Table), com cabeçalho ordenável, menu "Colunas", paginação de 10 e contagem. A barra de ferramentas (`BarraFiltros`) atualiza a URL (`router.replace` com debounce de 300 ms na busca) e a página (Server Component) refaz a consulta à API com esses parâmetros, como hoje. Ordenar e paginar no navegador basta para o volume atual e não exige mudança na API. As colunas são definidas em Client Components por página (`colunas.tsx`), recebendo os dados já carregados pelo servidor.

### D5. Painel da marca em CSS
O lado direito do login é um painel com gradiente na cor primária, o nome Super PDV e uma frase curta, sem arquivo de imagem (funciona offline e não pesa). O componente aceita uma imagem opcional para substituir o painel no futuro.

### D6. Tema violeta por tokens
Somente as variáveis do tema (`--primary`, `--primary-foreground`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--chart-*` se usados) mudam em `globals.css`, nos modos claro e escuro, com valores oklch da paleta `violet` do Tailwind (600 no claro, 500 no escuro) — o registry do shadcn só oferece temas de cinza (neutral, zinc, stone, gray e slate). Componentes não usam cores fixas. Alternativa descartada: trocar o `baseColor` do `components.json` (afetaria os cinzas de todo o projeto).

### D6.1. Fontes do Tailwind
`packages/ui/src/styles/globals.css` declara com `@source` as pastas analisadas pelo Tailwind: os apps e `packages/web-session/src`, onde agora ficam as classes do layout compartilhado. O caminho antigo dos apps (`../../../apps`) apontava para fora do repositório e só funcionava porque o Tailwind detecta sozinho os arquivos do app em build; foi corrigido.

### D7. Estado da sidebar entre páginas
O layout lê o cookie `sidebar_state` no servidor e passa `defaultOpen` para o `SidebarProvider`, evitando o menu "piscar" aberto ao navegar com ele recolhido.

### D8. Testes
- E2E existentes reescritos para os novos seletores (menu por nome, filtros por menu, busca por rótulo "Buscar", células por `role="cell"`), mantendo os mesmos cenários de negócio.
- Novos E2E para a spec `web-layout`: painel da marca visível em 1280 px e oculto em 390 px; Ctrl+B recolhe o menu; menu móvel; menu do usuário com "Sair"; trilha em página de detalhe; ordenar, esconder coluna e paginar (seed de 15 usuários criado pelo próprio teste via API); filtro na URL e "Limpar filtros".
- Teste unitário da trilha de navegação (função pura de caminho → etapas) em `web-session`.

## Risks / Trade-offs

- [Listas crescerem além do que cabe carregar de uma vez] → a paginação no navegador fica isolada no `DataTable`; migrar para paginação na API depois muda só a fonte dos dados e as props, sem mudar a spec.
- [Contraste do violeta no modo escuro] → valores do tema oficial do shadcn para violeta; verificação visual nos dois modos durante a implementação.
- [Blocos do registry mudarem no futuro] → os blocos são adaptados ao projeto (D1), não reinstalados; atualizar é escolha explícita.
- [Quebra dos E2E pelos novos seletores] → ajustados na mesma mudança, rodando a suíte completa antes do PR.

## Migration Plan

Sem migração de dados. A troca é de interface: publicar admin e gestor juntos; reverter é reverter o commit.
