# organization-structure Specification

## Purpose
Mantém as empresas (CNPJs) de cada cliente — cada estabelecimento com o seu CNPJ —, cadastradas pela equipe Super PDV e consultadas pelo cliente no gestor; são a base para PDVs, estoque e vendas.

## Requirements

### Requirement: Empresas cadastradas apenas pela equipe
Membros da equipe SHALL adicionar empresas a um cliente informando CNPJ, razão social, nome fantasia e endereço; usuários dos clientes MUST NOT criar, alterar ou inativar empresas.

#### Scenario: Nova empresa para um cliente
- **WHEN** a equipe adiciona ao "Grupo Silva" a empresa "Mercado Silva Filial" com CNPJ válido e endereço completo
- **THEN** a empresa é criada ativa no Grupo Silva, com o endereço informado

#### Scenario: Nova empresa sem endereço
- **WHEN** a equipe tenta adicionar uma empresa sem informar o número do endereço
- **THEN** a empresa não é criada e o formulário indica o campo número

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
Membros da equipe SHALL alterar razão social, nome fantasia e endereço e inativar ou reativar empresas; o CNPJ MUST NOT mudar e empresas MUST NOT ser excluídas. Empresas inativas MUST NOT aparecer entre as empresas em que os usuários podem atuar.

#### Scenario: CNPJ não muda
- **WHEN** a equipe tenta alterar o CNPJ de uma empresa existente
- **THEN** o CNPJ permanece o mesmo

#### Scenario: Alterar o endereço
- **WHEN** a equipe altera o número do endereço da "Mercado Silva Filial" e salva
- **THEN** a empresa passa a ter o novo número, mantendo os demais campos

#### Scenario: Empresa antiga sem endereço
- **WHEN** a equipe edita uma empresa cadastrada antes desta mudança, que não tem endereço
- **THEN** o formulário pede o endereço completo, e a edição só é salva com ele preenchido

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

### Requirement: Endereço da empresa
O endereço de uma empresa SHALL ter CEP, logradouro, número, bairro, cidade e UF obrigatórios e complemento opcional. O CEP MUST ter 8 dígitos e ser guardado sem máscara; a UF MUST ser uma das 27 unidades federativas; o número aceita texto, como "S/N" ou "120-A".

#### Scenario: CEP com máscara
- **WHEN** a equipe informa o CEP `01310-100`
- **THEN** o CEP é aceito e guardado como `01310100`, e o admin o exibe com máscara

#### Scenario: CEP inválido
- **WHEN** a equipe informa o CEP `1234`
- **THEN** a operação é recusada, indicando que o CEP é inválido

#### Scenario: UF inexistente
- **WHEN** a equipe informa a UF `XX`
- **THEN** a operação é recusada, indicando que a UF é inválida

#### Scenario: Endereço sem número
- **WHEN** o endereço não tem número e a equipe informa "S/N"
- **THEN** o endereço é aceito

### Requirement: Preenchimento do endereço pelo CEP
Nos formulários de empresa do admin, ao informar um CEP válido, o admin SHALL consultar um serviço público de CEP e preencher logradouro, bairro, cidade e UF, que MUST continuar editáveis. Uma falha na consulta MUST NOT impedir o cadastro.

#### Scenario: CEP encontrado
- **WHEN** a equipe digita o CEP `01310-100` no formulário de novo cliente
- **THEN** logradouro, bairro, cidade e UF são preenchidos com o endereço desse CEP e o foco vai para o número

#### Scenario: CEP não encontrado
- **WHEN** a equipe digita um CEP com 8 dígitos que o serviço não conhece
- **THEN** o admin avisa que o CEP não foi encontrado e os campos ficam livres para preenchimento manual

#### Scenario: Serviço de CEP indisponível
- **WHEN** o serviço de CEP não responde
- **THEN** o admin avisa que não foi possível buscar o endereço, e a equipe preenche e salva o endereço à mão
