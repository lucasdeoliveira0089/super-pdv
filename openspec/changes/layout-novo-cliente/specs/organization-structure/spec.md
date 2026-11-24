# Spec Delta

## MODIFIED Requirements

### Requirement: Preenchimento do endereço pelo CEP
Nos formulários de empresa do admin, ao informar um CEP válido, o admin SHALL consultar um serviço público de CEP e preencher logradouro, bairro, cidade e UF, que MUST continuar editáveis. O admin MUST NOT exibir mensagens sobre a busca (nem de andamento, nem de sucesso, nem de falha). Uma falha na consulta MUST NOT impedir o cadastro.

#### Scenario: CEP encontrado
- **WHEN** a equipe digita o CEP `01310-100` no formulário de novo cliente
- **THEN** logradouro, bairro, cidade e UF são preenchidos com o endereço desse CEP, o foco vai para o número e nenhuma mensagem é exibida abaixo do CEP

#### Scenario: CEP não encontrado
- **WHEN** a equipe digita um CEP com 8 dígitos que o serviço não conhece
- **THEN** nenhuma mensagem é exibida e os campos ficam livres para preenchimento manual

#### Scenario: Serviço de CEP indisponível
- **WHEN** o serviço de CEP não responde
- **THEN** nenhuma mensagem é exibida, e a equipe preenche e salva o endereço à mão

## ADDED Requirements

### Requirement: Máscara do CNPJ nos formulários do admin
O campo CNPJ dos formulários de cadastro de cliente e de empresa do admin SHALL aplicar a máscara `XX.XXX.XXX/XXXX-XX` durante a digitação, aceitando letras e números nas 12 primeiras posições (letras convertidas para maiúsculas) e apenas números nos 2 dígitos verificadores; caracteres fora desse padrão MUST ser ignorados.

#### Scenario: CNPJ numérico
- **WHEN** a equipe digita `11222333000181` no campo CNPJ
- **THEN** o campo exibe `11.222.333/0001-81`

#### Scenario: CNPJ alfanumérico
- **WHEN** a equipe digita `12abc34501de35` no campo CNPJ
- **THEN** o campo exibe `12.ABC.345/01DE-35`

#### Scenario: Letra no dígito verificador
- **WHEN** a equipe digita uma letra depois das 12 primeiras posições
- **THEN** a letra é ignorada e o campo continua aguardando os dígitos verificadores numéricos

#### Scenario: CNPJ colado com máscara
- **WHEN** a equipe cola `12.ABC.345/01DE-35` no campo CNPJ
- **THEN** o campo exibe `12.ABC.345/01DE-35`
