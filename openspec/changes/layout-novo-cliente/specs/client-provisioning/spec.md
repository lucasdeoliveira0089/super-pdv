# Spec Delta

## MODIFIED Requirements

### Requirement: Cadastro de cliente pelo admin
Membros da equipe SHALL cadastrar um cliente informando a primeira empresa (CNPJ, razão social, nome fantasia e endereço) e o responsável pelo cliente (nome, celular e e-mail). O nome do cliente MUST ser o nome fantasia da primeira empresa. O cadastro MUST NOT criar usuários: o Dono é cadastrado depois, no detalhe do cliente. Após o cadastro, o admin SHALL abrir o detalhe do cliente.

#### Scenario: Novo cliente
- **WHEN** a equipe cadastra a empresa "Mercado Silva" com endereço completo e a responsável Maria com celular `(11) 98765-4321`
- **THEN** o cliente "Mercado Silva" e a empresa são criados ativos, com o endereço e o responsável informados, e nenhum usuário é criado
- **AND** o admin abre o detalhe do cliente

#### Scenario: Sem campo de nome do cliente
- **WHEN** a equipe abre o formulário de novo cliente
- **THEN** não há campo "Nome do cliente" nem campos de Dono, e o cliente criado recebe o nome fantasia da empresa

#### Scenario: Responsável incompleto
- **WHEN** a equipe tenta cadastrar um cliente sem o celular do responsável
- **THEN** o cadastro é recusado, nada é criado e o formulário indica o campo celular

#### Scenario: Falha no cadastro não deixa resíduos
- **WHEN** qualquer parte do cadastro do cliente é recusada, como um CNPJ inválido
- **THEN** nada do novo cliente é criado e o formulário indica o campo com problema

#### Scenario: E-mail do Dono já usado
- **WHEN** a equipe cadastra, no detalhe do cliente, um Dono com e-mail que já pertence a um usuário de qualquer cliente
- **THEN** o cadastro do Dono é recusado informando que o e-mail já está em uso, junto ao campo

### Requirement: Listagem e consulta de clientes
Membros da equipe SHALL listar e buscar clientes por nome ou CNPJ de suas empresas. A lista SHALL mostrar de cada cliente as empresas e a situação, sem a coluna de Dono; os usuários Dono aparecem no detalhe do cliente.

#### Scenario: Busca por CNPJ
- **WHEN** a equipe busca pelo CNPJ de uma das empresas do "Grupo Silva"
- **THEN** o "Grupo Silva" aparece no resultado

#### Scenario: Colunas da lista
- **WHEN** a equipe abre a lista de clientes
- **THEN** as colunas são Cliente, Empresas e Situação, e os Donos de cada cliente são vistos no detalhe

## ADDED Requirements

### Requirement: Cadastro do Dono pelo admin
Membros da equipe SHALL cadastrar um usuário Dono para um cliente no detalhe do cliente, informando nome e e-mail. O sistema MUST exibir uma única vez a senha temporária do novo Dono. Um cliente pode ter mais de um Dono.

#### Scenario: Primeiro Dono
- **WHEN** a equipe abre o detalhe do cliente "Mercado Silva", que não tem Dono, e cadastra o Dono `joao@silva.com.br`
- **THEN** o Dono é criado ativo e precisa trocar a senha no primeiro acesso
- **AND** o admin exibe a senha temporária uma única vez, com opção de copiar, e o Dono passa a aparecer no detalhe

#### Scenario: Cliente sem Dono
- **WHEN** a equipe abre o detalhe de um cliente sem Dono
- **THEN** o admin informa que nenhum Dono foi cadastrado e oferece cadastrá-lo

#### Scenario: Usuário de cliente não cadastra Dono pelo admin
- **WHEN** um usuário de cliente tenta usar a rota de cadastro de Dono do admin
- **THEN** a API responde 401
