# Proposal

## Why

O cadastro de cliente no admin pede só o mínimo para o sistema funcionar: um "Nome do cliente" solto, CNPJ, razão social e nome fantasia da primeira empresa, e o nome e o e-mail do Dono. Faltam os dados de que a equipe Super PDV precisa para atender o cliente: o endereço de cada empresa e uma pessoa responsável para contato. O endereço também será necessário mais adiante para a parte fiscal.

## What Changes

- **Formulário "Novo cliente"** do admin reorganizado em quatro blocos:
  - **Empresa**: CNPJ, razão social e nome fantasia.
  - **Endereço da empresa**: CEP, logradouro, número, complemento (opcional), bairro, cidade e UF.
  - **Responsável**: nome, celular e e-mail.
  - **Dono**: nome e e-mail, como hoje; continua recebendo a senha temporária.
- **BREAKING (API do admin)**: o campo "Nome do cliente" deixa de existir no cadastro. O nome do cliente passa a ser o nome fantasia da primeira empresa. `POST /admin/clientes` não aceita mais `nome` e passa a exigir `empresa.endereco` e `responsavel`.
- **Endereço por empresa**: obrigatório (menos o complemento) ao cadastrar o cliente e ao adicionar uma empresa. Também pode ser alterado na edição da empresa. Empresas que já existem ficam sem endereço até serem editadas; a partir daí, salvar a edição exige o endereço completo.
- **Busca por CEP**: ao informar um CEP válido, o admin preenche sozinho o logradouro, o bairro, a cidade e a UF, consultando um serviço público de CEP. Os campos continuam editáveis. Se o CEP não for encontrado ou o serviço falhar, a equipe preenche à mão.
- **Responsável pelo cliente**: é um contato do cliente, não um usuário. Não tem login nem recebe senha. Nome, celular (com DDD) e e-mail são obrigatórios no cadastro, aparecem no detalhe do cliente e podem ser alterados pela equipe. Clientes que já existem ficam sem responsável até serem editados.
- **Seed de desenvolvimento** e testes atualizados com endereço e responsável.

## Capabilities

### New Capabilities
<!-- Nenhuma: os dados novos pertencem a capabilities que já existem. -->

### Modified Capabilities
- `client-provisioning`: o cadastro de cliente deixa de ter "Nome do cliente" (que passa a vir do nome fantasia) e passa a exigir o responsável. Entram também a consulta e a alteração do responsável no admin.
- `organization-structure`: as empresas passam a ter endereço, obrigatório no cadastro e alterável na edição, com preenchimento pelo CEP no admin.

## Impact

- **`packages/db`**: nova migration com as colunas de endereço em `empresas` e as do responsável em `clientes`, todas aceitando nulo por causa dos registros que já existem.
- **`packages/shared`**: contratos `clienteCriarSchema`, `clienteAtualizarSchema`, `clienteSchema`, `empresaCriarSchema`, `empresaAtualizarSchema` e `empresaSchema`; novas validações de CEP, UF e celular.
- **`apps/api`**: `ClientesService` (criação, edição, leitura) e testes de integração do admin; o seed de desenvolvimento.
- **`apps/admin`**: formulário de novo cliente, formulário de empresa (adicionar e editar), detalhe do cliente com o responsável e a busca por CEP; testes E2E.
- **Serviço externo**: consulta de CEP feita pelo servidor do admin, sem dados do cliente além do próprio CEP.
- **Gestor e PDV**: sem mudança visível nesta etapa.
- **README**: tabela do seed e descrição do cadastro de cliente.
