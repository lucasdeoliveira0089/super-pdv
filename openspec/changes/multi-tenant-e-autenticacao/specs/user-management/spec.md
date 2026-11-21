# Spec Delta

## Purpose

Permite que Donos, Administradores e Gerentes mantenham, no gestor, as pessoas que usam o cliente: cadastro com senha temporária, papel e empresas, desativação e redefinição de senha.

## ADDED Requirements

### Requirement: Cadastro de usuários com senha temporária
Usuários com permissão SHALL cadastrar usuários informando nome, e-mail, papel e, para Gerente e Operador de caixa, as empresas; o sistema MUST gerar uma senha temporária aleatória, exibida uma única vez a quem cadastrou.

#### Scenario: Novo usuário
- **WHEN** um Administrador cadastra a Gerente "Ana" com e-mail `ana@silva.com.br` na "Mercado Silva Centro"
- **THEN** o usuário é criado ativo, com senha temporária exibida uma única vez ao Administrador
- **AND** no primeiro login Ana precisa trocar a senha

#### Scenario: E-mail já usado
- **WHEN** o e-mail informado já pertence a um usuário de qualquer cliente
- **THEN** o cadastro é recusado informando que o e-mail já está em uso

### Requirement: Alteração de usuários
Usuários com permissão SHALL alterar nome, papel e empresas atribuídas de outros usuários; o e-mail MUST NOT ser alterado.

#### Scenario: Trocar empresas de um Operador
- **WHEN** um Dono atribui o Operador "Pedro" à "Mercado Silva Norte" em vez da "Mercado Silva Centro"
- **THEN** Pedro passa a poder operar apenas na "Mercado Silva Norte" a partir da próxima requisição

### Requirement: Desativação e reativação
Usuários com permissão SHALL desativar e reativar usuários; a desativação MUST encerrar todas as sessões do usuário, e ninguém pode desativar a si mesmo.

#### Scenario: Desativar usuário
- **WHEN** um Administrador desativa o Operador "Pedro"
- **THEN** Pedro não consegue mais entrar e as sessões dele são encerradas

#### Scenario: Desativar a si mesmo
- **WHEN** um usuário tenta desativar o próprio usuário
- **THEN** a operação é recusada

### Requirement: Redefinição de senha por um gestor
Usuários com permissão SHALL gerar uma nova senha temporária para outro usuário, exibida uma única vez a quem a gerou, encerrando as sessões do usuário afetado.

#### Scenario: Operador esqueceu a senha
- **WHEN** um Gerente redefine a senha do Operador "Pedro" da sua empresa
- **THEN** uma nova senha temporária é exibida ao Gerente e as sessões de Pedro são encerradas
- **AND** no próximo login Pedro precisa trocar a senha

### Requirement: Listagem de usuários
A API SHALL listar os usuários visíveis a quem consulta, com filtros por papel, empresa e situação, sem nunca retornar senhas ou hashes.

#### Scenario: Filtro por empresa
- **WHEN** um Dono lista os usuários filtrando pela "Mercado Silva Centro"
- **THEN** a resposta contém os usuários atribuídos a essa empresa, além de Donos e Administradores, que atuam em todas as empresas

### Requirement: Gestão de usuários no gestor
O gestor SHALL listar, cadastrar, editar, desativar, reativar e redefinir a senha de usuários, oferecendo apenas os papéis e empresas que o usuário logado pode atribuir.

#### Scenario: Papéis oferecidos ao Gerente
- **WHEN** um Gerente abre o formulário de novo usuário
- **THEN** o único papel oferecido é Operador de caixa e somente as empresas dele aparecem

#### Scenario: Senha temporária exibida uma vez
- **WHEN** o cadastro de um usuário é concluído no gestor
- **THEN** o gestor mostra a senha temporária com opção de copiar e avisa que ela não será exibida novamente
