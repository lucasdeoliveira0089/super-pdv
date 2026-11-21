# platform-team Specification

## Purpose
Dá à equipe Super PDV um acesso próprio ao admin, separado dos usuários dos clientes, para operar a plataforma: primeiro acesso, login e gestão dos membros da equipe.

## Requirements

### Requirement: Primeiro membro da equipe por comando interno
O sistema SHALL oferecer um comando interno, não exposto por HTTP, que cria um membro da equipe Super PDV com nome e e-mail e exibe uma senha temporária gerada aleatoriamente.

#### Scenario: Bootstrap da equipe
- **WHEN** alguém com acesso ao servidor executa o comando informando nome e e-mail
- **THEN** o membro da equipe é criado com senha temporária exibida uma única vez

#### Scenario: E-mail de equipe repetido
- **WHEN** o comando recebe o e-mail de um membro da equipe já existente
- **THEN** nada é criado e a mensagem informa que o e-mail já está em uso

### Requirement: Autenticação da equipe separada dos clientes
Membros da equipe SHALL entrar no admin com e-mail e senha seguindo as mesmas regras de mensagens genéricas, política de senha, senha temporária, sessão, bloqueio por tentativas e recuperação de senha dos usuários dos clientes, mas com credenciais e sessões independentes.

#### Scenario: Login da equipe no admin
- **WHEN** um membro ativo da equipe informa e-mail e senha corretos no admin
- **THEN** ele entra no admin

#### Scenario: Usuário de cliente no admin
- **WHEN** um usuário Dono de um cliente tenta entrar no admin com as credenciais dele
- **THEN** o login é recusado com a mensagem "E-mail ou senha inválidos"

### Requirement: Tokens da equipe e dos clientes não se misturam
Um token emitido para a equipe MUST NOT ser aceito nas rotas dos clientes, e um token de usuário de cliente MUST NOT ser aceito nas rotas da equipe.

#### Scenario: Token da equipe em rota de cliente
- **WHEN** um token de acesso da equipe é usado para listar usuários de um cliente pelas rotas do gestor
- **THEN** a API responde 401

#### Scenario: Token de cliente em rota da equipe
- **WHEN** um token de acesso de um Dono é usado em uma rota do admin
- **THEN** a API responde 401

### Requirement: Gestão dos membros da equipe
Membros da equipe SHALL cadastrar outros membros com senha temporária exibida uma única vez, listar, desativar, reativar e redefinir a senha deles; ninguém pode desativar a si mesmo e a equipe MUST manter ao menos um membro ativo.

#### Scenario: Novo membro da equipe
- **WHEN** um membro cadastra "Carla" com e-mail `carla@superpdv.com.br` pelo admin
- **THEN** Carla é criada ativa e a senha temporária é exibida uma única vez

#### Scenario: Desativar a si mesmo
- **WHEN** um membro da equipe tenta se desativar
- **THEN** a operação é recusada

### Requirement: Sessão no admin
O admin SHALL exigir login para todas as páginas exceto login e recuperação de senha, renovar o acesso automaticamente e MUST guardar os tokens fora do alcance de scripts da página.

#### Scenario: Página do admin sem login
- **WHEN** um visitante sem sessão abre uma página interna do admin
- **THEN** é redirecionado para a tela de login do admin e, após entrar, volta à página pedida

#### Scenario: Senha temporária no admin
- **WHEN** um membro da equipe com senha temporária entra no admin
- **THEN** é levado à tela de troca de senha antes de acessar qualquer outra página
