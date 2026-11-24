# Design

## Context

- O tema vem do `ThemeProvider` de cada app (`apps/<app>/components/theme-provider.tsx`, sobre o `next-themes`), hoje com `defaultTheme="system"`. Não existe botão de troca de tema.
- O formulário "Novo cliente" (`apps/admin/app/(app)/clientes/formularios.tsx`) usa `FieldSet` e `FieldLegend` numa coluna de `max-w-xl`. O endereço vem de `CamposEndereco` (`campos-endereco.tsx`), que também é usado em "Nova empresa" e "Editar empresa". Para restaurar a UF depois do `form.reset()` do React 19, o componente encontra o formulário pelo `ref` do seu `<fieldset>`.
- `packages/ui` já tem `Card` (`card.tsx`) e os campos `CampoTexto` e `CampoSelecao` (`campos.tsx`), sem indicação de obrigatoriedade.

Motivação: ver `proposal.md`. Comportamento esperado: ver `specs/web-layout`.

## Goals / Non-Goals

**Goals:**
- Admin sempre no tema claro, sem afetar o gestor.
- Um componente de seção em cartão reutilizável, para os próximos formulários seguirem o mesmo padrão.
- Indicação de campo obrigatório acessível nos campos compartilhados.

**Non-Goals:**
- Botão para o usuário trocar de tema.
- Levar os cartões para "Nova empresa", "Editar empresa" e "Editar responsável" (fica para outra mudança).
- Mudar regras de validação, a API ou os nomes dos campos enviados.

## Decisions

### Tema: `forcedTheme="light"` no `ThemeProvider` do admin
O `next-themes` com `forcedTheme` ignora a preferência do sistema e qualquer valor salvo no `localStorage`. O admin passa `forcedTheme="light"` (e `enableSystem={false}`). O gestor continua com `system`. Os tokens do modo escuro ficam em `packages/ui` para o gestor e para um futuro botão de troca.
- *Alternativa: `defaultTheme="light"`.* Basta enquanto não existe botão de troca, mas um valor antigo no `localStorage` do navegador ainda poderia abrir o admin no escuro. `forcedTheme` deixa a regra explícita.

### `SecaoFormulario` em `packages/ui`
Componente novo em `packages/ui/src/components/secao-formulario.tsx`, montado sobre `Card`: um `<section aria-labelledby>` com `CardHeader` (`CardTitle` como `<h2>` e `CardDescription`) e `CardContent` com `FieldGroup`. Os campos ficam visualmente dentro do cartão, e leitores de tela anunciam a seção pelo título. Fica em `packages/ui` porque é UI reutilizável. O app só compõe a tela.
- *Alternativa: manter `<fieldset>` com `<legend>` estilizado como cartão.* Funciona, mas um `legend` não aceita bem título e descrição, e o padrão do shadcn para esse visual é o `Card`.

### Campo obrigatório: propriedade `obrigatorio` em `CampoTexto` e `CampoSelecao`
Quando `obrigatorio` é verdadeiro, o rótulo ganha um `*` na cor de erro, com `aria-hidden` porque é só visual, e o controle ganha `aria-required="true"`, que é o que os leitores de tela anunciam. Não usamos o atributo `required`: os formulários são `noValidate`, e as mensagens de erro vêm do zod e da API, junto a cada campo. A propriedade é opcional, então os formulários atuais não mudam.

### `CamposEndereco` com duas apresentações
O componente ganha a propriedade `cartao`. Com ela, renderiza uma `SecaoFormulario` "Localização" com os obrigatórios marcados e o rótulo "Complemento" sem o "(opcional)", já que a ausência do asterisco indica isso. Sem ela, mantém o `FieldSet` atual, que continua sendo usado nos formulários de empresa. O `ref` usado para achar o formulário passa a ficar num elemento comum às duas apresentações, com `closest("form")`, para a correção da UF valer em ambas.

### Largura e grade de campos
Todo o conteúdo ocupa o contêiner centralizado de até 1280 px (`max-w-7xl`) da casca, inclusive os formulários. Não há colunas mais estreitas dentro dele: o usuário pediu que o conteúdo use de fato a largura do contêiner. Para os campos não ficarem longos demais, os formulários usam grades responsivas:
- **Empresa e Responsável:** 3 colunas a partir de `lg` e 2 a partir de `sm`.
- **Localização:** em `lg`, duas linhas: `[CEP 10rem | logradouro | número 8rem]` e `[complemento | bairro | cidade | UF 8rem]`.

Abaixo de `sm`, tudo vira uma coluna.

## Risks / Trade-offs

- [Seletores dos E2E baseados nas legendas antigas ("Endereço da empresa")] → Ajustados na mesma mudança. Os rótulos dos campos não mudam, exceto "Complemento" no cartão, que os testes não usam.
- [Cliente fica sem acesso até alguém cadastrar o Dono] → O detalhe deixa isso visível ("Nenhum Dono cadastrado") com o botão para cadastrar.
- [Quem usava o admin no escuro perde essa opção] → Foi o pedido. O botão de troca fica como evolução, com os tokens escuros preservados.
