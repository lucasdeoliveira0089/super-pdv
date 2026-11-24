# client-provisioning Specification

## Purpose
Permite que a equipe Super PDV, pelo admin, coloque um novo cliente no sistema — com a primeira empresa e o usuário Dono — e controle se o cliente pode usar a plataforma.

## Requirements

### Requirement: Cadastro de cliente pelo admin
Membros da equipe SHALL cadastrar um cliente informando a primeira empresa (CNPJ, razão social, nome fantasia e endereço), o responsável pelo cliente (nome, celular e e-mail) e o Dono (nome e e-mail). O nome do cliente MUST ser o nome fantasia da primeira empresa. O sistema MUST criar tudo junto e exibir uma única vez a senha temporária do Dono.

#### Scenario: Novo cliente
- **WHEN** a equipe cadastra a empresa "Mercado Silva" com endereço completo, a responsável Maria com celular `(11) 98765-4321` e o Dono `joao@silva.com.br`
- **THEN** o cliente "Mercado Silva", a empresa e o Dono são criados ativos, com o endereço e o responsável informados
- **AND** o admin exibe a senha temporária do Dono uma única vez, com opção de copiar

#### Scenario: Sem campo de nome do cliente
- **WHEN** a equipe abre o formulário de novo cliente
- **THEN** não há campo "Nome do cliente", e o cliente criado recebe o nome fantasia da empresa

#### Scenario: Responsável incompleto
- **WHEN** a equipe tenta cadastrar um cliente sem o celular do responsável
- **THEN** o cadastro é recusado, nada é criado e o formulário indica o campo celular

#### Scenario: Falha no cadastro não deixa resíduos
- **WHEN** qualquer parte do cadastro do cliente é recusada, como um CNPJ inválido
- **THEN** nada do novo cliente é criado e o formulário indica o campo com problema

#### Scenario: E-mail do Dono já usado
- **WHEN** o e-mail do Dono já pertence a um usuário de outro cliente
- **THEN** o cadastro é recusado informando que o e-mail já está em uso

### Requirement: Sem cadastro público de clientes
A API MUST NOT oferecer criação de clientes a ninguém além dos membros autenticados da equipe Super PDV.

#### Scenario: Usuário de cliente tenta criar cliente
- **WHEN** um Dono autenticado tenta usar a rota de cadastro de clientes
- **THEN** a API responde 401

### Requirement: Listagem e consulta de clientes
Membros da equipe SHALL listar e buscar clientes por nome ou CNPJ de suas empresas e ver de cada cliente as empresas, a situação e os usuários Dono.

#### Scenario: Busca por CNPJ
- **WHEN** a equipe busca pelo CNPJ de uma das empresas do "Grupo Silva"
- **THEN** o "Grupo Silva" aparece no resultado

### Requirement: Suspensão e reativação de clientes
Membros da equipe SHALL suspender e reativar clientes; enquanto suspenso, nenhum usuário do cliente consegue entrar e as sessões existentes deixam de ser aceitas.

#### Scenario: Cliente suspenso
- **WHEN** a equipe suspende o "Grupo Silva"
- **THEN** os usuários do Grupo Silva recebem a mensagem genérica de login inválido e os tokens já emitidos passam a receber 401

#### Scenario: Cliente reativado
- **WHEN** a equipe reativa o "Grupo Silva"
- **THEN** os usuários ativos do cliente voltam a conseguir entrar

### Requirement: Suporte ao Dono do cliente
Membros da equipe SHALL gerar uma nova senha temporária para um Dono de cliente, exibida uma única vez, encerrando as sessões desse Dono.

#### Scenario: Dono sem acesso
- **WHEN** a equipe redefine a senha do Dono `joao@silva.com.br`
- **THEN** uma nova senha temporária é exibida à equipe e João precisa trocá-la no próximo login

### Requirement: Responsável pelo cliente
Cada cliente SHALL ter um responsável para contato, com nome, celular brasileiro com DDD e e-mail. O responsável MUST NOT ser um usuário: não tem acesso ao gestor nem ao PDV e o seu e-mail pode repetir o de um usuário. O admin SHALL mostrar o responsável no detalhe do cliente e permitir alterá-lo.

#### Scenario: Responsável no detalhe
- **WHEN** a equipe abre o detalhe do cliente "Mercado Silva"
- **THEN** são exibidos o nome, o celular com máscara `(11) 98765-4321` e o e-mail da responsável

#### Scenario: Alterar o responsável
- **WHEN** a equipe troca o celular da responsável para `(21) 99876-5432` e salva
- **THEN** o detalhe do cliente passa a mostrar o novo celular

#### Scenario: Celular inválido
- **WHEN** a equipe informa como celular `(11) 3456-7890`, sem o 9 inicial de celular
- **THEN** a operação é recusada, indicando que o celular é inválido

#### Scenario: Responsável não entra no sistema
- **WHEN** alguém tenta entrar no gestor ou no PDV com o e-mail do responsável sem que ele seja também um usuário
- **THEN** o login é recusado como credencial inválida

#### Scenario: Cliente antigo sem responsável
- **WHEN** a equipe abre o detalhe de um cliente cadastrado antes desta mudança
- **THEN** o admin informa que o responsável não foi cadastrado e oferece cadastrá-lo
