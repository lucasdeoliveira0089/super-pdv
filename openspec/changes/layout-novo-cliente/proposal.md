# Proposal

## Why

A tela "Novo cliente" do admin ficou longa depois que ganhou endereço e responsável: são 15 campos numa coluna só, separados apenas por legendas, e difíceis de percorrer. Além disso, o admin segue o tema do sistema operacional e abre escuro em máquinas configuradas assim, quando o padrão desejado para o admin é o tema claro.

## What Changes

- **Tema claro no admin**: o admin passa a abrir sempre no tema claro, independentemente do tema do sistema operacional. O tema escuro continua definido no pacote de UI (o gestor e o PDV não mudam).
- **"Novo cliente" em cartões**: os campos ficam agrupados em cartões com título, no estilo do exemplo enviado, sem textos de ajuda abaixo dos campos:
  - **Empresa**: CNPJ, razão social e nome fantasia.
  - **Localização**: CEP, logradouro, número, complemento, bairro, cidade e UF (com a busca pelo CEP que já existe).
  - **Responsável**: nome, celular e e-mail.
- **Campos obrigatórios marcados com asterisco**, como no exemplo.
- **BREAKING (API do admin)**: **o cadastro de cliente deixa de criar o Dono**. O formulário não tem mais o bloco Dono, e `POST /v1/admin/clientes` não aceita mais `dono` nem devolve senha temporária. Após cadastrar, o admin abre o detalhe do cliente.
- **Cadastro do Dono no detalhe do cliente**: botão "Cadastrar Dono" (nome e e-mail), que cria o usuário Dono e exibe a senha temporária uma única vez. O detalhe informa quando o cliente ainda não tem Dono.
- Os campos de cada cartão aproveitam a largura em telas largas (por exemplo, razão social e nome fantasia lado a lado) e voltam a uma coluna no celular.

Fora do escopo: os formulários "Nova empresa", "Editar empresa" e "Editar responsável" e as demais telas continuam como estão. Podem adotar os cartões numa mudança futura.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
- `web-layout`: novos requisitos para o tema claro do admin e para formulários de cadastro agrupados em cartões, com campos obrigatórios indicados.
- `client-provisioning`: o cadastro de cliente deixa de criar o Dono; novo requisito para cadastrar o Dono no detalhe do cliente.
- `organization-structure`: máscara do CNPJ (numérico e alfanumérico) nos formulários de cliente e de empresa do admin.

## Impact

- **`apps/admin`**: `components/theme-provider.tsx` (tema claro fixo); formulário e página de "Novo cliente" (`app/(app)/clientes/formularios.tsx` e `novo/page.tsx`); `campos-endereco.tsx` passa a poder ser exibido dentro de um cartão com o título "Localização".
- **`packages/ui`**: `CampoTexto` e `CampoSelecao` ganham a indicação de campo obrigatório. A propriedade é opcional, então os formulários atuais não mudam.
- **`packages/shared`**: `clienteCriarSchema` sem `dono`; resposta do cadastro sem senha; contrato novo para cadastrar Dono.
- **`apps/api`**: `ClientesService.criar` sem o Dono; rota nova `POST /v1/admin/clientes/:id/donos`; testes de integração.
- **`apps/admin`**: detalhe do cliente com "Cadastrar Dono" e a tela do formulário.
- **Testes**: E2E do admin ajustados (cartões, tema claro e Dono cadastrado no detalhe). Sem mudança no banco.
