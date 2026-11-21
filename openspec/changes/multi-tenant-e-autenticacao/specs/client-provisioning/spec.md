# Spec Delta

## Purpose

Permite que a equipe Super PDV, pelo admin, coloque um novo cliente no sistema — com a primeira empresa e o usuário Dono — e controle se o cliente pode usar a plataforma.

## ADDED Requirements

### Requirement: Cadastro de cliente pelo admin
Membros da equipe SHALL cadastrar um cliente informando o nome do cliente, a primeira empresa (CNPJ, razão social, nome fantasia) e o Dono (nome e e-mail); o sistema MUST criar tudo junto e exibir uma única vez a senha temporária do Dono.

#### Scenario: Novo cliente
- **WHEN** a equipe cadastra o cliente "Grupo Silva" com a empresa "Mercado Silva" e o Dono `joao@silva.com.br`
- **THEN** o cliente, a empresa e o Dono são criados ativos
- **AND** o admin exibe a senha temporária do Dono uma única vez, com opção de copiar

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
