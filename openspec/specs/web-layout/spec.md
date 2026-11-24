# web-layout Specification

## Purpose
Define a estrutura visual comum do admin e do gestor (telas de autenticação, casca das páginas autenticadas e tabelas de listagem), para que toda tela nova siga o mesmo padrão de navegação e uso.

## Requirements

### Requirement: Telas de autenticação com painel da marca
As telas de login, recuperação e redefinição de senha, troca de senha obrigatória e "Acesso pelo PDV" do admin e do gestor SHALL exibir o formulário ao lado de um painel com a marca Super PDV, e o painel MUST ser ocultado em telas estreitas sem esconder nenhum campo ou ação.

#### Scenario: Login em tela larga
- **WHEN** alguém abre o login do gestor numa janela com 1280 px de largura
- **THEN** o formulário de login aparece à esquerda e o painel da marca Super PDV à direita

#### Scenario: Login no celular
- **WHEN** alguém abre o login do admin numa tela com 390 px de largura
- **THEN** o painel da marca não é exibido e o formulário aparece inteiro, sem rolagem horizontal

### Requirement: Sem opções de acesso inexistentes
As telas de autenticação MUST NOT oferecer login por provedores externos nem cadastro público, já que o sistema não tem nenhum dos dois.

#### Scenario: Opções no login
- **WHEN** alguém abre o login do gestor
- **THEN** as únicas ações disponíveis são entrar com e-mail e senha e "Esqueci minha senha"

### Requirement: Menu lateral recolhível
As páginas autenticadas SHALL ter um menu lateral com ícone e nome de cada item permitido, que MUST poder ser recolhido para mostrar só os ícones (por botão ou pelo atalho Ctrl+B) e que vira um painel deslizante em telas estreitas.

#### Scenario: Recolher pelo teclado
- **WHEN** o usuário logado no gestor pressiona Ctrl+B
- **THEN** o menu lateral passa a mostrar só os ícones, com o nome de cada item disponível ao passar o mouse ou focar

#### Scenario: Menu no celular
- **WHEN** um usuário abre o gestor numa tela com 390 px de largura e aciona o botão do menu
- **THEN** o menu abre sobre o conteúdo e fecha ao escolher um item

### Requirement: Identificação do contexto no menu
O topo do menu lateral SHALL identificar o produto e o contexto de uso — o nome do cliente no gestor e "Equipe Super PDV" no admin — sem permitir trocar de cliente ou de empresa a partir dali.

#### Scenario: Topo do menu no gestor
- **WHEN** um usuário do cliente "Mercado Silva" entra no gestor
- **THEN** o topo do menu mostra "Mercado Silva" e não oferece troca de cliente ou empresa

### Requirement: Menu do usuário logado
O rodapé do menu lateral SHALL mostrar o nome e o e-mail do usuário logado e abrir um menu com "Trocar senha" e "Sair".

#### Scenario: Sair pelo menu do usuário
- **WHEN** o usuário abre o menu do rodapé e escolhe "Sair"
- **THEN** a sessão é encerrada e ele volta à tela de login

### Requirement: Trilha de navegação
Toda página autenticada SHALL exibir no cabeçalho uma trilha de navegação da seção do menu até a página atual, com as etapas anteriores clicáveis.

#### Scenario: Página de detalhe
- **WHEN** um Dono abre o detalhe de um usuário no gestor
- **THEN** o cabeçalho mostra "Usuários › Detalhes", e "Usuários" leva de volta à lista

### Requirement: Tabelas de listagem padronizadas
As listagens do admin e do gestor SHALL oferecer ordenação por coluna, escolha das colunas visíveis, paginação de 10 itens por página com a contagem de resultados e uma mensagem quando não houver resultados.

#### Scenario: Ordenar pelo nome
- **WHEN** um Dono clica no cabeçalho "Nome" da lista de usuários
- **THEN** a lista é ordenada pelo nome, e um novo clique inverte a ordem

#### Scenario: Esconder uma coluna
- **WHEN** o usuário desmarca "E-mail" no menu "Colunas" da lista de usuários
- **THEN** a coluna E-mail deixa de ser exibida

#### Scenario: Mais de uma página
- **WHEN** a lista de usuários tem 15 resultados
- **THEN** são exibidos 10, com a contagem total e os botões "Anterior" e "Próximo"

#### Scenario: Nenhum resultado
- **WHEN** um filtro não encontra nenhum usuário
- **THEN** a tabela informa que não há resultados

### Requirement: Busca e filtros preservados no endereço
A busca e os filtros das listagens SHALL ser aplicados pelo servidor quando a API os oferece e MUST ficar registrados no endereço da página, para que recarregar ou compartilhar o link mantenha o resultado.

#### Scenario: Filtro por papel
- **WHEN** um Dono escolhe "Gerente" no filtro de papel da lista de usuários
- **THEN** a lista mostra apenas Gerentes e o endereço passa a conter o filtro escolhido

#### Scenario: Busca de cliente por CNPJ
- **WHEN** a equipe digita o CNPJ de uma empresa do "Grupo Silva" na busca de clientes do admin
- **THEN** o "Grupo Silva" aparece no resultado e o endereço contém a busca

#### Scenario: Limpar filtros
- **WHEN** o usuário aciona "Limpar filtros" numa lista filtrada
- **THEN** todos os filtros e a busca são removidos e a lista completa volta a ser exibida

### Requirement: Cor de destaque da marca
Os apps SHALL usar a cor violeta como cor de destaque (ações principais, item ativo do menu e foco), com contraste adequado nos modos claro e escuro.

#### Scenario: Ação principal
- **WHEN** a lista de usuários do gestor é exibida para quem pode cadastrar
- **THEN** o botão "Novo usuário" aparece na cor de destaque violeta
