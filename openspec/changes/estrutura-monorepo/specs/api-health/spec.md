# Spec Delta

## Purpose

Permite que monitoramento, orquestradores e, futuramente, o PDV saibam se a API está viva e se consegue acessar o banco de dados, sem exigir autenticação.

## ADDED Requirements

### Requirement: Endpoint de vida da API
A API SHALL expor um endpoint público de vida que responde com sucesso sempre que o processo estiver em execução, sem consultar dependências externas.

#### Scenario: API em execução
- **WHEN** um cliente faz uma requisição GET ao endpoint de vida
- **THEN** a API responde com status HTTP 200 e corpo JSON contendo `status: "ok"`

#### Scenario: Banco indisponível não afeta a vida
- **WHEN** o banco de dados está inacessível e um cliente consulta o endpoint de vida
- **THEN** a API ainda responde com status HTTP 200

### Requirement: Endpoint de prontidão da API
A API SHALL expor um endpoint público de prontidão que verifica a conexão com o banco de dados e informa o estado de cada dependência verificada.

#### Scenario: Banco acessível
- **WHEN** um cliente faz uma requisição GET ao endpoint de prontidão e o banco responde
- **THEN** a API responde com status HTTP 200 e corpo JSON indicando `status: "ok"` e o banco como disponível

#### Scenario: Banco inacessível
- **WHEN** um cliente faz uma requisição GET ao endpoint de prontidão e o banco não responde dentro do tempo limite
- **THEN** a API responde com status HTTP 503 e corpo JSON indicando `status: "error"` e o banco como indisponível

### Requirement: Saúde sem exposição de dados sensíveis
As respostas dos endpoints de saúde MUST NOT conter credenciais, strings de conexão, mensagens de erro internas ou detalhes de infraestrutura além do estado de cada dependência.

#### Scenario: Falha de conexão com detalhes internos
- **WHEN** a verificação do banco falha com uma mensagem de erro do driver contendo host e usuário
- **THEN** a resposta de prontidão não inclui essa mensagem, host ou usuário
