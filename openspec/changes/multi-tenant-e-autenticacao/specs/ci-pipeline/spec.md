# Spec Delta

## MODIFIED Requirements

### Requirement: Verificação apenas do que foi afetado
O CI SHALL executar as verificações somente nos apps e pacotes afetados pela alteração e em seus dependentes, reaproveitando resultados anteriores quando as entradas não mudaram.

#### Scenario: Alteração restrita ao admin
- **WHEN** um pull request altera apenas arquivos de `apps/admin`
- **THEN** as verificações da API, do gestor e do PDV não são reexecutadas

#### Scenario: Alteração restrita ao gestor
- **WHEN** um pull request altera apenas arquivos de `apps/gestor`
- **THEN** as verificações da API, do admin e do PDV não são reexecutadas

#### Scenario: Alteração em pacote compartilhado
- **WHEN** um pull request altera `packages/ui`
- **THEN** as verificações de `packages/ui`, do PDV, do gestor e do admin são executadas
