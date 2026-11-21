# ci-pipeline Specification

## Purpose

Define as verificações automáticas que protegem a branch principal e a geração automatizada do instalador do PDV, para que nenhum código quebrado seja integrado sem ser detectado.

## Requirements

### Requirement: Verificação automática de pull requests
Todo pull request e todo push para a branch principal SHALL disparar automaticamente lint, checagem de tipos, testes e build, e o resultado SHALL ficar visível no pull request.

#### Scenario: Pull request com teste falhando
- **WHEN** um pull request introduz código que faz um teste falhar
- **THEN** a verificação do pull request termina com falha e identifica o pacote e o teste que falharam

#### Scenario: Pull request válido
- **WHEN** um pull request passa em lint, tipos, testes e build
- **THEN** a verificação do pull request termina com sucesso

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

### Requirement: Testes de integração com banco real no CI
O CI SHALL executar os testes de integração da API contra um PostgreSQL real e efêmero, sem depender de banco compartilhado.

#### Scenario: Testes de integração da API
- **WHEN** o CI executa os testes da API
- **THEN** um PostgreSQL temporário é criado para os testes e descartado ao final

### Requirement: Instalador do PDV gerado pelo CI
O CI SHALL gerar o instalador Windows do PDV em ambiente Windows e disponibilizá-lo como artefato da execução quando o PDV ou suas dependências forem alterados na branch principal. A assinatura de código SHALL ser aplicada quando o certificado estiver configurado nos segredos do repositório.

#### Scenario: Merge que altera o PDV
- **WHEN** uma alteração que afeta o PDV é integrada na branch principal
- **THEN** o CI gera o instalador Windows e o disponibiliza para download na execução

#### Scenario: Certificado não configurado
- **WHEN** o instalador é gerado sem certificado configurado nos segredos
- **THEN** o instalador é gerado sem assinatura e a execução registra um aviso de que não foi assinado
