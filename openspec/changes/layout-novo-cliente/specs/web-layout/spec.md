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
O formulário "Novo cliente" do admin SHALL agrupar os campos em cartões com título e descrição curta, nesta ordem: "Empresa" (CNPJ, razão social, nome fantasia), "Localização" (CEP, logradouro, número, complemento, bairro, cidade, UF), "Responsável" (nome, celular, e-mail) e "Dono" (nome, e-mail).

#### Scenario: Cartões do novo cliente
- **WHEN** a equipe abre o formulário "Novo cliente"
- **THEN** são exibidos os cartões "Empresa", "Localização", "Responsável" e "Dono", nessa ordem, cada um com os seus campos

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
