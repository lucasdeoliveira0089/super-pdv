# Proposal

## Why

A tela "Novo cliente" do admin ficou longa depois que ganhou endereço e responsável: são 15 campos numa coluna só, separados apenas por legendas, e difíceis de percorrer. Além disso, o admin segue o tema do sistema operacional e abre escuro em máquinas configuradas assim, quando o padrão desejado para o admin é o tema claro.

## What Changes

- **Tema claro no admin**: o admin passa a abrir sempre no tema claro, independentemente do tema do sistema operacional. O tema escuro continua definido no pacote de UI (o gestor e o PDV não mudam).
- **"Novo cliente" em cartões**: os campos ficam agrupados em cartões com título e uma breve descrição, no estilo do exemplo enviado:
  - **Empresa**: CNPJ, razão social e nome fantasia.
  - **Localização**: CEP, logradouro, número, complemento, bairro, cidade e UF (com a busca pelo CEP que já existe).
  - **Responsável**: nome, celular e e-mail.
  - **Dono**: nome e e-mail de acesso ao sistema, que recebe a senha temporária.
- **Campos obrigatórios marcados com asterisco**, como no exemplo, e a dica de cada campo logo abaixo dele.
- Os campos de cada cartão aproveitam a largura em telas largas (por exemplo, razão social e nome fantasia lado a lado) e voltam a uma coluna no celular.

Fora do escopo: os formulários "Nova empresa", "Editar empresa" e "Editar responsável" e as demais telas continuam como estão. Podem adotar os cartões numa mudança futura.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
- `web-layout`: novos requisitos para o tema claro do admin e para formulários de cadastro agrupados em cartões, com campos obrigatórios indicados.

## Impact

- **`apps/admin`**: `components/theme-provider.tsx` (tema claro fixo); formulário e página de "Novo cliente" (`app/(app)/clientes/formularios.tsx` e `novo/page.tsx`); `campos-endereco.tsx` passa a poder ser exibido dentro de um cartão com o título "Localização".
- **`packages/ui`**: `CampoTexto` e `CampoSelecao` ganham a indicação de campo obrigatório. A propriedade é opcional, então os formulários atuais não mudam.
- **Testes**: E2E do admin ajustados aos títulos dos cartões; teste do tema claro no admin. Sem mudança na API, no banco ou nas regras de validação.
