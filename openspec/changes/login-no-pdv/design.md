# Design

## Context

O PDV (Electron) já tem renderer com `contextIsolation`/`sandbox`, preload tipado (`window.superPdv`) e SQLite local no processo principal. A API, após `multi-tenant-e-autenticacao`, oferece `POST /v1/auth/login|refresh|logout|senha`, `GET /v1/me` (papel, permissões e empresas ativas em que o usuário pode atuar) e o código `PASSWORD_CHANGE_REQUIRED`; os contratos estão em `packages/shared`.

## Goals / Non-Goals

**Goals:**
- Login, troca de senha, escolha de empresa e sessão persistente no PDV, sem expor tokens à interface.
- Fluxo inteiro pelo teclado.
- E2E executável no runner Windows sem banco de dados.

**Non-Goals:**
- Login offline, PIN, ativação do caixa e liberação por supervisor (`ativacao-do-caixa`).
- Alterar rotas ou regras da API.

## Decisions

### D1. Processo principal concentra rede e segredos

- `ApiClient`: `fetch` para `MAIN_VITE_API_URL` (padrão `http://localhost:3333`), timeout de 10 s, respostas validadas com os schemas de `packages/shared`; renova o token de acesso uma vez em 401 e repete a chamada.
- `SessionStore`: grava `{ refreshToken, empresaId }` cifrado com `safeStorage` em `userData/session.bin`; o token de acesso fica só em memória. Se `safeStorage.isEncryptionAvailable()` for falso, a sessão vale só enquanto o app estiver aberto (nunca em texto puro).
- Alternativa descartada: tokens no renderer (`localStorage`) — qualquer XSS ou dependência comprometida os leria.

### D2. API exposta pelo preload

`auth.entrar(email, senha)`, `auth.trocarSenha(atual, nova)`, `auth.sair()`, `sessao.obter()` (usuário, papel, empresas e empresa escolhida — **sem tokens**), `empresa.escolher(id)` e `abrirRecuperacaoSenha()` (abre `MAIN_VITE_GESTOR_URL/esqueci-senha` com `shell.openExternal`). Erros chegam ao renderer como códigos (`CREDENCIAIS_INVALIDAS`, `BLOQUEADO`, `SEM_CONEXAO`, `SESSAO_EXPIRADA`, `SENHA_INVALIDA`), nunca como mensagens cruas da rede.

### D3. Renderer como máquina de estados

`carregando → login → trocar-senha → escolher-empresa → principal`, com transição de volta ao login em `SESSAO_EXPIRADA`. Formulários com foco inicial, Tab/Enter, Esc para voltar e mensagens acessíveis (`role="alert"`). Componentes de `packages/ui` (`input`, `label`, `field`, `alert`, `card`, `button`) — os que ainda não existirem serão adicionados pela mudança anterior. A tela principal mantém o indicador do banco local.

### D4. Inicialização

Ao abrir: se houver sessão salva, renova; sucesso → `principal` (ou `escolher-empresa` se a empresa salva não estiver mais disponível); 401 → apaga a sessão e mostra o login; sem rede → login com aviso de conexão.

### D5. Configuração

`MAIN_VITE_API_URL` e `MAIN_VITE_GESTOR_URL` (prefixo do electron-vite para o processo principal), com padrões de desenvolvimento e documentação no `.env.example` do PDV; validadas com zod na inicialização.

### D6. Testes

- **Unitários no runtime do Electron**: `SessionStore` (arquivo cifrado, sem persistência sem criptografia), `ApiClient` (renovação em 401, mapeamento de erros) e garantia de que nenhuma resposta IPC contém tokens.
- **E2E** (Playwright `_electron`) contra um **servidor simulado da API** em Node, iniciado pelo teste, que implementa as rotas usadas e valida requisições e respostas com os schemas de `packages/shared`. O runner Windows do CI não roda containers Linux; a autenticação real já é testada na API.

## Risks / Trade-offs

- [Servidor simulado divergir da API real] → ambos usam os mesmos schemas zod; um teste de contrato compara as respostas do simulado com os schemas.
- [`safeStorage` indisponível] → login a cada abertura, sem gravar token em texto puro.
- [Sessão longa (30 dias) num computador compartilhado do caixa] → "Sair" sempre visível; o bloqueio por operador e PIN vêm com `ativacao-do-caixa`.

## Migration Plan

Sem migração de dados; a tela de boas-vindas atual é substituída pelo fluxo de login.
