# Spec Delta

## MODIFIED Requirements

### Requirement: Execução em modo de desenvolvimento
O repositório SHALL oferecer um comando na raiz que inicia todos os apps em modo de desenvolvimento e comandos para iniciar cada app isoladamente, com recarga automática ao alterar código, inclusive de pacotes compartilhados.

#### Scenario: Iniciar todos os apps
- **WHEN** a pessoa desenvolvedora executa o comando de desenvolvimento na raiz com o banco local disponível
- **THEN** a API responde no endpoint de saúde, o admin e o gestor abrem no navegador em portas distintas e o PDV abre uma janela desktop

#### Scenario: Alteração em pacote compartilhado
- **WHEN** um componente de `packages/ui` é alterado com os apps em execução
- **THEN** o PDV, o gestor e o admin refletem a alteração sem reiniciar manualmente

### Requirement: Componentes de UI compartilhados
Os componentes de interface reutilizáveis SHALL residir em um único pacote consumido pelo PDV, pelo gestor e pelo admin, com o mesmo tema visual em todos.

#### Scenario: Mesmo componente nos dois apps
- **WHEN** a tela inicial do PDV e a página inicial do gestor são exibidas
- **THEN** ambas renderizam componentes importados do pacote de UI compartilhado com o mesmo tema

#### Scenario: Mesmo componente nos três apps
- **WHEN** a tela inicial do PDV e as telas de login do gestor e do admin são exibidas
- **THEN** todas renderizam componentes importados do pacote de UI compartilhado com o mesmo tema

#### Scenario: Novo componente adicionado ao pacote
- **WHEN** um novo componente é adicionado ao pacote de UI pelo fluxo padrão do repositório
- **THEN** ele fica disponível para importação no PDV, no gestor e no admin sem copiar arquivos entre apps

### Requirement: Verificações de qualidade locais
O repositório SHALL oferecer comandos na raiz para lint, formatação, checagem de tipos e testes de todos os apps e pacotes, falhando quando qualquer verificação falhar.

#### Scenario: Código com erro de tipo
- **WHEN** um arquivo de qualquer app ou pacote contém um erro de tipo e o comando de checagem de tipos é executado na raiz
- **THEN** o comando termina com falha e indica o arquivo e o erro

#### Scenario: Execução de testes
- **WHEN** o comando de testes é executado na raiz com os pré-requisitos instalados
- **THEN** os testes unitários, de integração da API e end-to-end do admin, do gestor e do PDV são executados e o resultado de cada pacote é reportado

## ADDED Requirements

### Requirement: Caixa de e-mails local para desenvolvimento
O repositório SHALL fornecer, junto ao banco local, um servidor de e-mail de desenvolvimento que captura todas as mensagens enviadas pela API e as exibe numa interface web, sem entregá-las a destinatários reais.

#### Scenario: E-mail de recuperação em desenvolvimento
- **WHEN** a pessoa desenvolvedora solicita a recuperação de senha com o ambiente local no ar
- **THEN** a mensagem aparece na interface web de e-mails local e não é enviada para fora

### Requirement: Dados de demonstração
O repositório SHALL oferecer um comando que cria, no banco local, um membro da equipe, um cliente de demonstração com duas empresas e um usuário de cada papel, com credenciais documentadas apenas para desenvolvimento.

#### Scenario: Ambiente pronto para testar
- **WHEN** a pessoa desenvolvedora executa o comando de dados de demonstração após aplicar as migrations
- **THEN** consegue entrar no admin com o membro da equipe e no gestor com os usuários do cliente de demonstração
