# tenant-isolation Specification

## Purpose
Garante que os dados de cada cliente fiquem isolados: nenhum usuário de cliente, requisição ou erro de programação permite ler ou alterar dados de outro cliente.

## Requirements

### Requirement: Todo dado de negócio pertence a um cliente
Todo registro de negócio (empresas, usuários dos clientes e os que vierem depois) SHALL estar associado a exatamente um cliente; nas rotas usadas por gestor e PDV, o cliente MUST ser definido pela sessão do usuário, nunca pelo corpo ou parâmetros da requisição.

#### Scenario: Cliente informado na requisição é ignorado
- **WHEN** um Dono cadastra um usuário enviando no corpo o identificador de outro cliente
- **THEN** o usuário é criado no cliente do próprio Dono

### Requirement: Leitura isolada por cliente
Consultas feitas em nome de um usuário de cliente MUST retornar apenas registros do cliente desse usuário.

#### Scenario: Listagem não mostra outros clientes
- **WHEN** Donos de dois clientes diferentes listam empresas no gestor
- **THEN** cada um vê somente as empresas do próprio cliente

#### Scenario: Acesso direto a registro de outro cliente
- **WHEN** um usuário de cliente requisita, pelo identificador, um usuário de outro cliente
- **THEN** a API responde 404, como se o registro não existisse

### Requirement: Escrita isolada por cliente
Alterações feitas em nome de um usuário de cliente MUST NOT afetar registros de outro cliente.

#### Scenario: Alteração de registro de outro cliente
- **WHEN** um Administrador tenta desativar, pelo identificador, um usuário de outro cliente
- **THEN** a API responde 404 e o usuário permanece ativo

### Requirement: Isolamento garantido pelo banco de dados
O isolamento entre clientes MUST ser imposto pelo próprio banco de dados, de forma que uma consulta feita no contexto de um cliente, mesmo sem filtro de cliente no código, retorne apenas dados daquele cliente.

#### Scenario: Consulta sem filtro de cliente
- **WHEN** a aplicação executa, no contexto de um cliente, uma consulta sem condição de cliente
- **THEN** o banco retorna apenas os registros daquele cliente

#### Scenario: Consulta sem contexto de cliente
- **WHEN** a aplicação executa uma consulta a tabelas de negócio no papel restrito sem ter definido o cliente em uso
- **THEN** o banco não retorna nenhum registro

### Requirement: Visão entre clientes restrita à equipe
Somente as rotas do admin, usadas por membros autenticados da equipe Super PDV, SHALL acessar dados de mais de um cliente.

#### Scenario: Equipe lista clientes
- **WHEN** um membro da equipe lista os clientes no admin
- **THEN** a resposta contém clientes diferentes com as respectivas empresas
