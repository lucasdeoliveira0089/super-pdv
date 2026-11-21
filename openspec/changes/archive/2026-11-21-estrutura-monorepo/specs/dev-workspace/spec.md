# Spec Delta

## Purpose

Garante que qualquer pessoa desenvolvedora consiga preparar o ambiente, executar, verificar e construir todos os produtos do Super PDV a partir da raiz do repositório, com comandos únicos e previsíveis.

## ADDED Requirements

### Requirement: Instalação única do workspace
O repositório SHALL instalar as dependências de todos os apps e pacotes com um único comando executado na raiz, usando a versão de Node e do gerenciador de pacotes fixadas no próprio repositório.

#### Scenario: Instalação em ambiente limpo
- **WHEN** a pessoa desenvolvedora clona o repositório e executa o comando de instalação na raiz com a versão de Node fixada
- **THEN** as dependências de todos os apps e pacotes são instaladas sem erros
- **AND** módulos nativos usados pelo PDV ficam utilizáveis pelo runtime do Electron sem compilação manual

#### Scenario: Versão de Node incompatível
- **WHEN** o comando de instalação é executado com uma versão de Node diferente da fixada
- **THEN** a instalação falha com mensagem indicando a versão exigida

### Requirement: Execução em modo de desenvolvimento
O repositório SHALL oferecer um comando na raiz que inicia todos os apps em modo de desenvolvimento e comandos para iniciar cada app isoladamente, com recarga automática ao alterar código, inclusive de pacotes compartilhados.

#### Scenario: Iniciar todos os apps
- **WHEN** a pessoa desenvolvedora executa o comando de desenvolvimento na raiz com o banco local disponível
- **THEN** a API responde no endpoint de saúde, o painel administrativo abre no navegador e o PDV abre uma janela desktop

#### Scenario: Alteração em pacote compartilhado
- **WHEN** um componente de `packages/ui` é alterado com os apps em execução
- **THEN** o PDV e o painel administrativo refletem a alteração sem reiniciar manualmente

### Requirement: Componentes de UI compartilhados
Os componentes de interface reutilizáveis SHALL residir em um único pacote consumido pelo PDV e pelo painel administrativo, com o mesmo tema visual em ambos.

#### Scenario: Mesmo componente nos dois apps
- **WHEN** a tela inicial do PDV e a página inicial do admin são exibidas
- **THEN** ambas renderizam componentes importados do pacote de UI compartilhado com o mesmo tema

#### Scenario: Novo componente adicionado ao pacote
- **WHEN** um novo componente é adicionado ao pacote de UI pelo fluxo padrão do repositório
- **THEN** ele fica disponível para importação no PDV e no admin sem copiar arquivos entre apps

### Requirement: Verificações de qualidade locais
O repositório SHALL oferecer comandos na raiz para lint, formatação, checagem de tipos e testes de todos os apps e pacotes, falhando quando qualquer verificação falhar.

#### Scenario: Código com erro de tipo
- **WHEN** um arquivo de qualquer app ou pacote contém um erro de tipo e o comando de checagem de tipos é executado na raiz
- **THEN** o comando termina com falha e indica o arquivo e o erro

#### Scenario: Execução de testes
- **WHEN** o comando de testes é executado na raiz com os pré-requisitos instalados
- **THEN** os testes unitários, de integração da API e end-to-end do admin e do PDV são executados e o resultado de cada pacote é reportado

### Requirement: Banco de dados local para desenvolvimento
O repositório SHALL fornecer um PostgreSQL local para desenvolvimento, iniciado por um comando documentado, e um comando para aplicar migrations nele.

#### Scenario: Subir o banco local
- **WHEN** a pessoa desenvolvedora executa o comando de banco local com o Docker em execução
- **THEN** um PostgreSQL fica acessível com as credenciais do arquivo de exemplo de ambiente e os dados persistem entre reinicializações

### Requirement: Configuração de ambiente validada
Cada app SHALL validar suas variáveis de ambiente na inicialização e recusar iniciar quando uma variável obrigatória estiver ausente ou inválida. O repositório SHALL conter um arquivo de exemplo de ambiente por app, sem segredos reais, e arquivos de ambiente reais MUST ser ignorados pelo controle de versão.

#### Scenario: Variável obrigatória ausente
- **WHEN** a API é iniciada sem a URL de conexão do banco definida
- **THEN** a API não inicia e exibe mensagem identificando a variável ausente

#### Scenario: Arquivo de ambiente real
- **WHEN** um arquivo de ambiente real é criado em qualquer app
- **THEN** ele não aparece como arquivo a ser versionado

### Requirement: Banco local do PDV operante no Electron
O PDV SHALL abrir, no processo principal, um banco SQLite local armazenado na pasta de dados do usuário, tanto em desenvolvimento quanto no instalador gerado.

#### Scenario: PDV instalado abre o banco local
- **WHEN** o PDV é instalado a partir do instalador gerado e aberto
- **THEN** o arquivo do banco local é criado na pasta de dados do usuário e a tela inicial indica que o banco local está operante

### Requirement: Documentação de preparação do ambiente
O repositório SHALL conter um README na raiz descrevendo pré-requisitos, preparação do ambiente e os comandos de desenvolvimento, testes, banco local e build.

#### Scenario: Seguir o README
- **WHEN** uma pessoa desenvolvedora nova segue o README em uma máquina com os pré-requisitos listados
- **THEN** ela consegue executar os três apps e a suíte de testes sem passos não documentados
