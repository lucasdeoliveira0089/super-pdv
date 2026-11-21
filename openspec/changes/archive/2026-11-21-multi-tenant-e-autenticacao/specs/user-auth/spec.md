# Spec Delta

## Purpose

Identifica com segurança os usuários dos clientes que usam o gestor e o PDV: login por e-mail e senha, sessões renováveis e revogáveis, troca de senha temporária, proteção contra força bruta e recuperação de senha por e-mail.

## ADDED Requirements

### Requirement: Login com e-mail e senha
A API SHALL autenticar usuários por e-mail (sem diferenciar maiúsculas e minúsculas) e senha, emitindo um token de acesso e um token de renovação quando as credenciais forem válidas.

#### Scenario: Credenciais válidas
- **WHEN** um usuário ativo envia e-mail e senha corretos
- **THEN** a API responde 200 com um token de acesso e um token de renovação

#### Scenario: E-mail com letras maiúsculas
- **WHEN** o usuário cadastrado como `ana@loja.com` faz login com `Ana@Loja.com`
- **THEN** o login é aceito

### Requirement: Falha de login sem revelar contas
Quando o login falhar, a API MUST responder com o mesmo status e a mesma mensagem genérica, sem indicar se o e-mail existe, se a senha está errada ou se o usuário está desativado.

#### Scenario: Senha incorreta
- **WHEN** um usuário envia a senha errada
- **THEN** a API responde 401 com a mensagem "E-mail ou senha inválidos"

#### Scenario: E-mail inexistente
- **WHEN** alguém tenta entrar com um e-mail não cadastrado
- **THEN** a API responde 401 com a mesma mensagem "E-mail ou senha inválidos"

#### Scenario: Usuário desativado
- **WHEN** um usuário desativado envia e-mail e senha corretos
- **THEN** a API responde 401 com a mesma mensagem "E-mail ou senha inválidos"

### Requirement: Senhas nunca armazenadas em texto
O sistema MUST armazenar apenas um hash resistente a força bruta de cada senha, e nenhuma resposta, log ou mensagem de erro SHALL conter senhas ou seus hashes.

#### Scenario: Senha no banco
- **WHEN** um usuário define a senha `Segredo#2026`
- **THEN** o banco contém apenas o hash dessa senha, e não o texto `Segredo#2026`

### Requirement: Política de senha
Senhas novas MUST ter entre 8 e 128 caracteres e MUST NOT ser iguais ao e-mail do usuário.

#### Scenario: Senha curta
- **WHEN** um usuário tenta definir a senha `abc123`
- **THEN** a operação é recusada informando o tamanho mínimo de 8 caracteres

#### Scenario: Senha igual ao e-mail
- **WHEN** o usuário `ana@loja.com` tenta definir a senha `ana@loja.com`
- **THEN** a operação é recusada

### Requirement: Token de acesso de curta duração
O token de acesso SHALL expirar 15 minutos após a emissão; requisições a rotas protegidas sem token válido MUST receber 401.

#### Scenario: Token expirado
- **WHEN** um cliente usa um token de acesso emitido há mais de 15 minutos
- **THEN** a API responde 401

#### Scenario: Token adulterado
- **WHEN** um cliente usa um token de acesso com conteúdo alterado
- **THEN** a API responde 401

### Requirement: Renovação de sessão com rotação
A API SHALL trocar um token de renovação válido por um novo par de tokens, invalidando o token de renovação usado. A sessão MUST expirar 30 dias após o último login.

#### Scenario: Renovação bem-sucedida
- **WHEN** o cliente envia um token de renovação válido
- **THEN** a API devolve um novo token de acesso e um novo token de renovação
- **AND** o token de renovação anterior deixa de ser aceito

#### Scenario: Reuso de token de renovação
- **WHEN** um token de renovação já usado é apresentado novamente
- **THEN** a API responde 401 e encerra toda a sessão à qual ele pertencia

#### Scenario: Usuário desativado durante a sessão
- **WHEN** um usuário desativado tenta renovar a sessão
- **THEN** a API responde 401

### Requirement: Logout
A API SHALL encerrar a sessão atual quando o usuário fizer logout, invalidando o token de renovação dessa sessão.

#### Scenario: Renovar após logout
- **WHEN** o usuário faz logout e depois tenta renovar com o token de renovação daquela sessão
- **THEN** a API responde 401

### Requirement: Troca obrigatória de senha temporária
Um usuário com senha temporária MUST definir uma nova senha antes de usar qualquer outra funcionalidade; até lá a API SHALL recusar as demais rotas protegidas com 403 e o código `PASSWORD_CHANGE_REQUIRED`.

#### Scenario: Acesso com senha temporária
- **WHEN** um usuário com senha temporária, já autenticado, acessa a listagem de empresas
- **THEN** a API responde 403 com o código `PASSWORD_CHANGE_REQUIRED`

#### Scenario: Troca concluída
- **WHEN** o usuário informa a senha temporária e uma nova senha válida
- **THEN** a senha é alterada e as demais rotas passam a ser permitidas conforme o seu papel

### Requirement: Troca de senha pelo próprio usuário
Um usuário autenticado SHALL poder trocar a própria senha informando a senha atual; a troca MUST encerrar todas as outras sessões do usuário.

#### Scenario: Senha atual incorreta
- **WHEN** o usuário tenta trocar a senha informando a senha atual errada
- **THEN** a troca é recusada e a senha não muda

#### Scenario: Outras sessões encerradas
- **WHEN** o usuário troca a senha estando logado em dois navegadores
- **THEN** a sessão do outro navegador deixa de conseguir renovar o acesso

### Requirement: Proteção contra força bruta
Após 5 tentativas de login com senha incorreta para o mesmo e-mail em 15 minutos, a API MUST recusar novas tentativas para esse e-mail por 15 minutos com 429, mesmo com a senha correta.

#### Scenario: Bloqueio após tentativas falhas
- **WHEN** ocorrem 5 tentativas com senha errada para o mesmo e-mail em 15 minutos
- **THEN** a sexta tentativa, ainda que com a senha correta, recebe 429

#### Scenario: Fim do bloqueio
- **WHEN** passam 15 minutos desde o bloqueio
- **THEN** o usuário consegue entrar com a senha correta

### Requirement: Solicitação de recuperação de senha
A API SHALL aceitar pedidos de recuperação por e-mail, respondendo sempre da mesma forma, e, quando o e-mail pertencer a um usuário ativo, enviar um link de redefinição no gestor válido por 1 hora.

#### Scenario: E-mail cadastrado
- **WHEN** alguém solicita recuperação para o e-mail de um usuário ativo
- **THEN** a API responde 202 e o usuário recebe um e-mail com o link de redefinição

#### Scenario: E-mail não cadastrado
- **WHEN** alguém solicita recuperação para um e-mail inexistente
- **THEN** a API responde 202 da mesma forma e nenhum e-mail é enviado

### Requirement: Redefinição de senha pelo link
O link de recuperação SHALL permitir definir uma nova senha uma única vez dentro da validade; a redefinição MUST encerrar todas as sessões do usuário e desbloquear tentativas de login.

#### Scenario: Link válido
- **WHEN** o usuário abre o link dentro de 1 hora e define uma nova senha válida
- **THEN** a senha é alterada e todas as sessões anteriores são encerradas

#### Scenario: Link reutilizado ou expirado
- **WHEN** o link já foi usado ou tem mais de 1 hora
- **THEN** a redefinição é recusada informando que o link é inválido ou expirou

### Requirement: Sessão no gestor
O gestor SHALL exigir login para todas as páginas exceto login e recuperação de senha, manter a sessão renovando o acesso automaticamente e MUST guardar os tokens fora do alcance de scripts da página.

#### Scenario: Página protegida sem login
- **WHEN** um visitante sem sessão abre uma página interna do gestor
- **THEN** é redirecionado para a tela de login do gestor e, após entrar, volta à página pedida

#### Scenario: Tokens inacessíveis ao JavaScript
- **WHEN** um script na página do gestor tenta ler os tokens da sessão
- **THEN** os tokens não estão disponíveis para o script

#### Scenario: Senha temporária no gestor
- **WHEN** um usuário com senha temporária entra no gestor
- **THEN** é levado à tela de troca de senha e não consegue abrir outras páginas antes de concluir
