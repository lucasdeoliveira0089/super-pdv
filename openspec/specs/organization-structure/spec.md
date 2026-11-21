# organization-structure Specification

## Purpose
Mantém as empresas (CNPJs) de cada cliente — cada estabelecimento com o seu CNPJ —, cadastradas pela equipe Super PDV e consultadas pelo cliente no gestor; são a base para PDVs, estoque e vendas.

## Requirements

### Requirement: Empresas cadastradas apenas pela equipe
Membros da equipe SHALL adicionar empresas a um cliente informando CNPJ, razão social e nome fantasia; usuários dos clientes MUST NOT criar, alterar ou inativar empresas.

#### Scenario: Nova empresa para um cliente
- **WHEN** a equipe adiciona ao "Grupo Silva" a empresa "Mercado Silva Filial" com CNPJ válido
- **THEN** a empresa é criada ativa no Grupo Silva

#### Scenario: Dono tenta criar empresa
- **WHEN** um Dono autenticado tenta criar uma empresa pela API
- **THEN** a API não oferece essa operação aos usuários dos clientes e responde 403

### Requirement: Validação de CNPJ numérico e alfanumérico
O sistema MUST aceitar CNPJ numérico e alfanumérico (letras maiúsculas e números nas 12 primeiras posições), com ou sem máscara, validando os dígitos verificadores e armazenando-o sem pontuação.

#### Scenario: CNPJ numérico com máscara
- **WHEN** a empresa é cadastrada com `11.222.333/0001-81`
- **THEN** o CNPJ é aceito e armazenado como `11222333000181`

#### Scenario: CNPJ alfanumérico
- **WHEN** a empresa é cadastrada com um CNPJ alfanumérico de dígitos verificadores válidos, como `12.ABC.345/01DE-35`
- **THEN** o CNPJ é aceito

#### Scenario: Dígito verificador inválido
- **WHEN** a empresa é cadastrada com `11.222.333/0001-82`
- **THEN** o cadastro é recusado informando que o CNPJ é inválido

### Requirement: CNPJ único no sistema
Um CNPJ MUST pertencer a no máximo uma empresa em todo o sistema.

#### Scenario: CNPJ já cadastrado em outro cliente
- **WHEN** a equipe tenta cadastrar uma empresa com o CNPJ de uma empresa de outro cliente
- **THEN** o cadastro é recusado informando que o CNPJ já está cadastrado

### Requirement: Alteração e inativação de empresas
Membros da equipe SHALL alterar razão social e nome fantasia e inativar ou reativar empresas; o CNPJ MUST NOT mudar e empresas MUST NOT ser excluídas. Empresas inativas MUST NOT aparecer entre as empresas em que os usuários podem atuar.

#### Scenario: CNPJ não muda
- **WHEN** a equipe tenta alterar o CNPJ de uma empresa existente
- **THEN** o CNPJ permanece o mesmo

#### Scenario: Empresa inativa fora da atuação
- **WHEN** a equipe inativa a única empresa atribuída a um Operador e ele consulta os próprios dados de acesso
- **THEN** a lista de empresas em que ele pode atuar vem vazia

### Requirement: Consulta de empresas no gestor
O gestor SHALL listar as empresas que o usuário pode ver — todas do cliente para Dono e Administrador, as atribuídas para Gerente — com CNPJ mascarado, razão social, nome fantasia e situação, sem opções de alteração.

#### Scenario: Gerente consulta empresas
- **WHEN** um Gerente atribuído à "Mercado Silva Filial" abre a lista de empresas no gestor
- **THEN** ele vê apenas a "Mercado Silva Filial"

### Requirement: Gestão de empresas no admin
O admin SHALL listar, adicionar, editar, inativar e reativar as empresas de um cliente, mostrando o CNPJ com máscara e os erros de validação junto aos campos.

#### Scenario: CNPJ inválido no formulário do admin
- **WHEN** a equipe salva uma empresa com CNPJ inválido
- **THEN** o formulário mostra o erro junto ao campo CNPJ e nada é salvo
