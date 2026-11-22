# pdv-session Specification

## Purpose
Permite que um usuário do cliente entre no PDV com as mesmas credenciais do gestor, escolha a empresa (CNPJ) em que vai operar e mantenha a sessão entre reinícios, com operação inteira pelo teclado.

## Requirements

### Requirement: Login online no PDV
O PDV SHALL exibir uma tela de login com e-mail e senha, validados na API, seguindo as mesmas mensagens e regras de bloqueio do login do gestor; a tela MUST ser operável apenas pelo teclado.

#### Scenario: Login pelo teclado
- **WHEN** o operador abre o PDV, digita e-mail, pressiona Tab, digita a senha e pressiona Enter
- **THEN** o login é enviado sem uso do mouse

#### Scenario: Credenciais inválidas
- **WHEN** o operador informa a senha errada
- **THEN** o PDV mostra "E-mail ou senha inválidos" e mantém o e-mail preenchido

#### Scenario: Sem conexão com a API
- **WHEN** o operador tenta entrar e a API não está acessível
- **THEN** o PDV informa que é necessária conexão com o servidor para entrar

### Requirement: Escolha da empresa de operação
Após o login, o PDV SHALL oferecer as empresas ativas em que o usuário pode atuar, selecionando automaticamente quando houver apenas uma, e MUST exibir na tela principal o nome fantasia e o CNPJ mascarado da empresa escolhida.

#### Scenario: Uma empresa
- **WHEN** um Operador atribuído apenas à "Mercado Silva Centro" entra no PDV
- **THEN** a empresa é selecionada automaticamente e a tela principal mostra o nome e o CNPJ dela

#### Scenario: Várias empresas
- **WHEN** um Dono de cliente com três empresas ativas entra no PDV
- **THEN** o PDV pede que ele escolha uma das três antes de prosseguir

#### Scenario: Nenhuma empresa disponível
- **WHEN** todas as empresas atribuídas ao usuário estão inativas
- **THEN** o PDV informa que não há empresa disponível para operar e não prossegue

### Requirement: Troca de senha temporária no PDV
Um usuário com senha temporária que entrar pelo PDV SHALL definir a nova senha no próprio PDV antes de prosseguir.

#### Scenario: Primeiro acesso do operador
- **WHEN** um Operador recém-cadastrado entra no PDV com a senha temporária
- **THEN** o PDV pede a nova senha e só depois segue para a escolha da empresa

### Requirement: Sessão persistente e protegida
O PDV SHALL manter a sessão e a empresa escolhida após fechar e reabrir o aplicativo; os tokens MUST ficar apenas no processo principal, guardados com a criptografia do sistema operacional, e nunca ficar acessíveis à interface.

#### Scenario: Reabrir o PDV
- **WHEN** o operador fecha e reabre o PDV com a sessão ainda válida
- **THEN** o PDV abre direto na tela principal da empresa escolhida

#### Scenario: Interface sem acesso aos tokens
- **WHEN** a interface do PDV inspeciona tudo o que o processo principal expõe a ela
- **THEN** nenhum token de acesso ou de renovação está disponível

#### Scenario: Sessão recusada pela API
- **WHEN** o usuário foi desativado ou o cliente suspenso e o PDV tenta renovar a sessão
- **THEN** o PDV descarta a sessão guardada e volta para a tela de login

### Requirement: Saída e troca de empresa
O PDV SHALL permitir sair, encerrando a sessão na API e apagando-a do computador, e trocar a empresa de operação sem novo login.

#### Scenario: Sair
- **WHEN** o operador escolhe "Sair"
- **THEN** o PDV volta à tela de login e, ao reabrir, não restaura a sessão anterior

### Requirement: Recuperação de senha a partir do PDV
A tela de login do PDV SHALL oferecer "Esqueci minha senha", abrindo a página de recuperação do gestor no navegador do sistema.

#### Scenario: Esqueci minha senha
- **WHEN** o operador aciona "Esqueci minha senha" no PDV
- **THEN** a página de recuperação de senha do gestor abre no navegador padrão
