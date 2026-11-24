# Tasks

## 1. Componentes compartilhados (`packages/ui`)

- [x] 1.1 Adicionar a propriedade opcional `obrigatorio` a `CampoTexto` e `CampoSelecao`, com um asterisco `aria-hidden` no rótulo e `aria-required="true"` no controle. Verificar com um teste Vitest que um campo obrigatório expõe `aria-required` e o asterisco, que um sem a propriedade não expõe nenhum dos dois, e que os testes atuais de formulário continuam passando.
- [x] 1.2 Criar `SecaoFormulario`, um cartão com título `<h2>`, descrição e conteúdo, sobre o `Card` e numa `<section aria-labelledby>`. Verificar com um teste Vitest que a seção é encontrada pelo papel `region` com o nome do título.

## 2. Admin: tema claro

- [ ] 2.1 Configurar o `ThemeProvider` do admin com `forcedTheme="light"`, sem seguir o sistema; o gestor não muda. Verificar com um E2E do admin que emula `colorScheme: "dark"` e confere que `<html>` não tem a classe `dark`.

## 3. Admin: "Novo cliente" em cartões

- [ ] 3.1 Dar a `CamposEndereco` a apresentação em cartão "Localização" (propriedade `cartao`), com os obrigatórios marcados, e mover o `ref` usado na correção da UF para um elemento comum às duas apresentações. Verificar que "Nova empresa" e "Editar empresa" continuam iguais, pelos E2E de empresas.
- [ ] 3.2 Reorganizar `FormNovoCliente` nos cartões Empresa, Localização, Responsável e Dono, com descrições curtas, campos obrigatórios marcados e a grade de duas colunas em telas largas, em `max-w-3xl`. Verificar com o E2E de cadastro de cliente ajustado: cartões na ordem certa, erro do número dentro de "Localização" e `aria-required` no CEP e não no complemento.
- [ ] 3.3 Verificar com um E2E na largura de 390 px que o formulário "Novo cliente" não tem rolagem horizontal.

## 4. Verificação final

- [ ] 4.1 Executar `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`, os E2E do admin e do gestor e `openspec validate layout-novo-cliente --strict`, e verificar que todos passam. Conferir no navegador, na tela "Novo cliente", o tema claro e os cartões.

## Workflow follow-up

- Arquivar a mudança na mesma branch antes do merge, sincronizando a spec `web-layout`.
