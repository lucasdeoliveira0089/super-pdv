# Spec Delta

## ADDED Requirements

### Requirement: Tema claro no admin
O admin SHALL abrir sempre no tema claro, independentemente da preferência de tema do sistema operacional ou do navegador.

#### Scenario: Sistema operacional no modo escuro
- **WHEN** um membro da equipe abre o admin num computador configurado com o tema escuro
- **THEN** o admin é exibido no tema claro

#### Scenario: Gestor não muda
- **WHEN** um usuário abre o gestor num computador configurado com o tema escuro
- **THEN** o gestor continua seguindo o tema do sistema operacional

### Requirement: Formulário de cadastro em cartões
O formulário "Novo cliente" do admin SHALL agrupar os campos em cartões com título, sem textos de ajuda, nesta ordem: "Empresa" (CNPJ, razão social, nome fantasia), "Localização" (CEP, logradouro, número, complemento, bairro, cidade, UF) e "Responsável" (nome, celular, e-mail).

#### Scenario: Cartões do novo cliente
- **WHEN** a equipe abre o formulário "Novo cliente"
- **THEN** são exibidos os cartões "Empresa", "Localização" e "Responsável", nessa ordem, cada um com os seus campos

#### Scenario: Formulário no celular
- **WHEN** a equipe abre o formulário "Novo cliente" numa tela com 390 px de largura
- **THEN** os cartões e os campos ficam em uma coluna, sem rolagem horizontal

#### Scenario: Erro dentro do cartão
- **WHEN** a equipe envia o formulário sem o número do endereço
- **THEN** o erro aparece junto ao campo número, dentro do cartão "Localização"

### Requirement: Campos obrigatórios indicados
Nos formulários que agrupam campos em cartões, os campos obrigatórios SHALL exibir um asterisco junto ao rótulo e MUST ser anunciados como obrigatórios para tecnologias assistivas; os opcionais não têm asterisco.

#### Scenario: Obrigatório e opcional
- **WHEN** a equipe abre o cartão "Localização"
- **THEN** o rótulo "CEP" tem asterisco e o campo é anunciado como obrigatório, e o rótulo "Complemento" não tem asterisco

### Requirement: Conteúdo centralizado com largura máxima
O conteúdo das páginas autenticadas do admin e do gestor SHALL ficar centralizado na área ao lado do menu e ocupar a largura de até 1280 px, inclusive em páginas de formulário, cujos campos MUST se distribuir em mais de uma coluna em telas largas; em áreas mais estreitas, o conteúdo MUST ocupar a largura disponível, com margem lateral.

#### Scenario: Lista em tela Full HD
- **WHEN** a equipe abre a lista de clientes numa janela de 1920 px de largura
- **THEN** o conteúdo tem no máximo 1280 px de largura e fica centralizado ao lado do menu

#### Scenario: Formulário em tela Full HD
- **WHEN** a equipe abre "Novo cliente" numa janela de 1920 px de largura
- **THEN** o título e os cartões do formulário ocupam a mesma largura da lista (até 1280 px), centralizados ao lado do menu, e CNPJ, razão social e nome fantasia ficam na mesma linha

#### Scenario: Notebook
- **WHEN** a equipe abre a lista de clientes numa janela de 1366 px de largura
- **THEN** o conteúdo ocupa a largura disponível ao lado do menu, sem rolagem horizontal
