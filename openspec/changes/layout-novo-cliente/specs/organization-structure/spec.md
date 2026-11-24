# Spec Delta

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
