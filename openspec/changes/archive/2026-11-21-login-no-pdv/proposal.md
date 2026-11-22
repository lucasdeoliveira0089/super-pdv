# Proposal

## Why

Depois de `multi-tenant-e-autenticacao`, os clientes já têm usuários, papéis e empresas, mas o PDV ainda abre direto numa tela de boas-vindas, sem saber quem está operando nem em qual CNPJ. Esta mudança coloca o login no PDV, com as mesmas credenciais do gestor, e a escolha da empresa de operação — pré-requisito para abrir caixa e vender.

## What Changes

- Tela de login no PDV (e-mail e senha), operável inteiramente pelo teclado, validada online na API (`/v1/auth/*`).
- Troca obrigatória da senha temporária no próprio PDV.
- Escolha da empresa (CNPJ) de operação entre as empresas ativas do usuário, automática quando há apenas uma; tela principal mostrando a empresa e o CNPJ, com "Trocar empresa" e "Sair".
- Sessão mantida entre reinícios: tokens apenas no processo principal, guardados com a criptografia do sistema operacional; a interface nunca acessa tokens.
- Retorno ao login quando a API recusar a sessão (usuário desativado, cliente suspenso, sessão revogada) e aviso claro quando não houver conexão.
- "Esqueci minha senha" abrindo a recuperação do gestor no navegador.
- Testes E2E do PDV contra um servidor simulado da API, que valida os mesmos contratos de `packages/shared`.

## Capabilities

### New Capabilities
- `pdv-session`: login online, escolha da empresa, troca de senha temporária e sessão persistente e protegida no PDV.

### Modified Capabilities
<!-- Nenhuma: usa as rotas de user-auth e access-control sem alterar o comportamento delas. -->

## Impact

- **Depende de**: `multi-tenant-e-autenticacao` (rotas de autenticação de clientes, `/v1/me` com as empresas de atuação e permissão `pdv.operar`) já implementada.
- **PDV** (`apps/pdv`): cliente HTTP e armazenamento de sessão no processo principal, novos canais IPC no preload, telas de login, troca de senha, escolha de empresa e principal; a tela de boas-vindas atual é substituída, mantendo o indicador do banco local.
- **Configuração**: URL da API e do gestor no build do PDV.
- **Testes/CI**: servidor simulado da API para os E2E do PDV no runner Windows.
- **Fora desta mudança**: login offline e PIN do operador, cadastro/ativação do caixa e liberação por supervisor (`ativacao-do-caixa`).
