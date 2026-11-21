# Spec Delta

## Purpose

Define o que cada usuário de um cliente pode fazer no gestor e no PDV: papéis fixos traduzidos em permissões granulares, com Gerentes e Operadores restritos às empresas atribuídas, aplicados igualmente na API e nas interfaces.

## ADDED Requirements

### Requirement: Papéis fixos
Cada usuário de cliente SHALL ter exatamente um papel entre Dono, Administrador, Gerente e Operador de caixa. Dono e Administrador atuam em todas as empresas do cliente; Gerente e Operador de caixa atuam apenas nas empresas atribuídas a eles (ao menos uma).

#### Scenario: Gerente sem empresa
- **WHEN** alguém tenta salvar um Gerente sem nenhuma empresa atribuída
- **THEN** a operação é recusada informando que é preciso ao menos uma empresa

### Requirement: Permissões por papel
A API SHALL decidir cada operação por permissões granulares derivadas do papel, conforme a matriz: Dono — acessar o gestor, operar o PDV, ler empresas, ler e gerenciar usuários; Administrador — o mesmo, exceto gerenciar usuários Dono; Gerente — acessar o gestor, operar o PDV, ler as suas empresas, ler usuários das suas empresas e gerenciar Operadores de caixa delas; Operador de caixa — apenas operar o PDV.

#### Scenario: Administrador cadastra Gerente
- **WHEN** um Administrador cadastra um Gerente
- **THEN** o usuário é criado

#### Scenario: Gerente tenta cadastrar Administrador
- **WHEN** um Gerente tenta cadastrar um usuário com papel Administrador
- **THEN** a API responde 403

#### Scenario: Gerente cadastra operador na sua empresa
- **WHEN** um Gerente cadastra um Operador de caixa em uma empresa atribuída a ele
- **THEN** o usuário é criado

#### Scenario: Operador de caixa nas rotas do gestor
- **WHEN** um Operador de caixa autenticado acessa qualquer rota de gestão da API
- **THEN** a API responde 403

### Requirement: Escopo por empresa
Para Gerentes e Operadores de caixa, a API MUST restringir leituras e operações às empresas atribuídas ao usuário.

#### Scenario: Listagem de usuários do Gerente
- **WHEN** um Gerente da "Mercado Silva Centro" lista usuários de um cliente que também tem a "Mercado Silva Norte"
- **THEN** a resposta não contém Gerentes nem Operadores atribuídos somente à "Mercado Silva Norte"

#### Scenario: Operação em empresa não atribuída
- **WHEN** um Gerente da "Mercado Silva Centro" tenta cadastrar um Operador na "Mercado Silva Norte"
- **THEN** a API responde 403

### Requirement: Proteção dos usuários Dono
Somente um Dono MUST poder criar, alterar o papel, desativar ou redefinir a senha de outro Dono, e o cliente MUST manter sempre ao menos um Dono ativo.

#### Scenario: Administrador altera um Dono
- **WHEN** um Administrador tenta desativar um Dono
- **THEN** a API responde 403

#### Scenario: Último Dono
- **WHEN** o único Dono ativo tenta mudar o próprio papel ou se desativar
- **THEN** a operação é recusada informando que o cliente precisa de ao menos um Dono ativo

### Requirement: Mudanças de papel valem imediatamente
Alterações de papel, de empresas atribuídas ou desativação de um usuário MUST valer a partir da próxima requisição dele, sem esperar o token de acesso expirar.

#### Scenario: Papel rebaixado
- **WHEN** um Administrador é alterado para Gerente enquanto está com sessão ativa
- **THEN** a próxima tentativa dele de cadastrar um Administrador recebe 403

#### Scenario: Usuário desativado com token válido
- **WHEN** um usuário desativado usa um token de acesso ainda não expirado
- **THEN** a API responde 401

### Requirement: Consulta do próprio acesso
A API SHALL informar ao usuário autenticado seus dados, papel, permissões e as empresas em que pode atuar.

#### Scenario: Dados do usuário logado
- **WHEN** um Gerente consulta os próprios dados de acesso
- **THEN** a resposta contém nome, e-mail, papel Gerente, as permissões do papel e as empresas atribuídas

### Requirement: Gestor exibe apenas o permitido
O gestor SHALL exibir no menu e nas ações somente o que as permissões do usuário permitem e MUST mostrar uma página de acesso negado quando ele abrir diretamente um endereço não permitido.

#### Scenario: Endereço não permitido
- **WHEN** um Gerente abre diretamente um endereço do gestor reservado a Dono e Administrador
- **THEN** o gestor mostra a página de acesso negado

#### Scenario: Operador de caixa no gestor
- **WHEN** um Operador de caixa faz login no gestor
- **THEN** o gestor informa que o perfil dele não tem acesso ao gestor e que deve usar o PDV
