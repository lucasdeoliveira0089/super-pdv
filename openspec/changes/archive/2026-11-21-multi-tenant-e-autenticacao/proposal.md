# Proposal

## Why

O Super PDV atende vários clientes na mesma infraestrutura, e nenhuma funcionalidade de negócio (catálogo, caixa, vendas) pode existir antes de sabermos **de quem** é cada dado e **quem** pode acessá-lo. Esta mudança estabelece essa fundação e separa os públicos web do sistema: a equipe Super PDV (admin) e o cliente que administra as suas empresas (gestor), ambos com login. O login no PDV vem na mudança seguinte, `login-no-pdv`, sobre a mesma API.

## What Changes

- **BREAKING (estrutura do repositório)**: o app `apps/admin` atual passa a se chamar `apps/gestor` (painel do cliente) e um **novo `apps/admin`** é criado como backoffice da equipe Super PDV.
- Hierarquia de dados: Cliente (tenant) → Empresa (CNPJ; cada estabelecimento tem o seu) → PDV. Não há nível "Loja".
- Isolamento entre clientes com `tenant_id` e **Row Level Security** no PostgreSQL; apenas as rotas do admin enxergam mais de um cliente.
- **Admin (equipe Super PDV)**: membros da equipe com login próprio (primeiro membro criado por comando interno), cadastro de clientes com a primeira empresa e o Dono (senha temporária), gestão de empresas (CNPJ numérico e alfanumérico, único no sistema), suspensão de clientes, suporte ao Dono e gestão da equipe.
- **Gestor (cliente)**: login, troca obrigatória de senha temporária, recuperação de senha por e-mail, consulta das empresas e gestão de usuários com papéis fixos (Dono, Administrador, Gerente, Operador de caixa) atribuídos a empresas.
- Autenticação própria na API: token de acesso curto, renovação rotativa com detecção de reuso, bloqueio após tentativas falhas e tokens da equipe e dos clientes que não se misturam.
- Envio de e-mail por SMTP, com caixa de e-mails local para desenvolvimento, e comando de dados de demonstração.

## Capabilities

### New Capabilities
- `platform-team`: membros da equipe Super PDV — primeiro acesso por comando, autenticação separada dos clientes e gestão da equipe no admin.
- `client-provisioning`: cadastro de clientes (com primeira empresa e Dono), consulta, suspensão e suporte ao Dono pelo admin.
- `tenant-isolation`: dados de um cliente nunca lidos ou alterados por outro; visão entre clientes restrita ao admin.
- `user-auth`: login, sessão, logout, senha temporária, proteção contra força bruta e recuperação de senha dos usuários dos clientes, e sessão no gestor.
- `access-control`: papéis fixos, permissões granulares e escopo por empresa no gestor e no PDV.
- `organization-structure`: empresas (CNPJs) de cada cliente — cadastradas pela equipe e consultadas no gestor.
- `user-management`: cadastro, alteração, desativação e redefinição de senha de usuários do cliente no gestor.

### Modified Capabilities
- `dev-workspace`: execução, UI compartilhada e testes passam a envolver admin, gestor e PDV; novos requisitos de caixa de e-mails local e dados de demonstração.
- `ci-pipeline`: os cenários de "verificação apenas do que foi afetado" passam a considerar `apps/admin` e `apps/gestor`.

## Impact

- **Repositório**: renomeação `apps/admin` → `apps/gestor` (pacote `@super-pdv/gestor`, CI, README, testes) e novo `apps/admin` (`@super-pdv/admin`); novo pacote `packages/web-session` com a sessão BFF compartilhada pelos dois apps web.
- **Banco**: primeiras tabelas de negócio, papel de banco restrito e políticas RLS em `packages/db`.
- **API**: módulos de autenticação (clientes e equipe), autorização, admin (clientes, empresas, equipe) e gestor (empresas, usuários), já prontos para o PDV consumir (`/v1/auth/*`, `/v1/me` com as empresas de atuação); comandos de bootstrap e de dados de demonstração; novas variáveis de ambiente.
- **Infra local**: serviço de e-mail de desenvolvimento no `docker-compose.yml`.
- **Dependências novas**: argon2, JWT, limitador de requisições, cliente SMTP, contexto de requisição, formulários (react-hook-form).
- **Fora desta mudança**: login no PDV (`login-no-pdv`), cadastro e ativação de PDVs (caixas), login offline/PIN e liberação por supervisor (`ativacao-do-caixa`), papéis personalizados, convites, cadastro público, SSO, 2FA e auditoria.
