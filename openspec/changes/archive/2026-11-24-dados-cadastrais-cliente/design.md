# Design

## Context

Hoje `clientes` tem só `nome` e `ativo`, e `empresas` tem `cnpj`, `razao_social`, `nome_fantasia` e `ativa` (migration `0001_modelo_multi_tenant.sql`). O admin monta o cadastro numa server action (`apps/admin/app/(app)/clientes/acoes.ts`): ela valida com os schemas zod de `packages/shared` e chama `POST /v1/admin/clientes`. Na API, `ClientesService.criar` grava cliente, empresa e Dono numa única transação. O mesmo par contrato + serviço atende "Adicionar empresa" e a edição da empresa. Já existem clientes e empresas no banco (seed e uso real), então as colunas novas não podem nascer obrigatórias no banco.

Motivação e escopo: ver `proposal.md`. Regras: ver `specs/client-provisioning` e `specs/organization-structure`.

## Goals / Non-Goals

**Goals:**
- Guardar o endereço de cada empresa e o responsável de cada cliente, validados da mesma forma no admin e na API.
- Preencher o endereço a partir do CEP sem depender do serviço externo para conseguir salvar.
- Conviver com os registros antigos, que ficam sem endereço e sem responsável, sem migração de dados.

**Non-Goals:**
- Mostrar endereço ou responsável no gestor ou no PDV.
- Telefone fixo, vários responsáveis ou vários endereços por empresa.
- Inscrição estadual, código IBGE do município e demais dados fiscais (entram com a NFC-e).
- Manter o nome do cliente sincronizado com o nome fantasia depois do cadastro.

## Decisions

### Endereço como colunas em `empresas`
Colunas `endereco_cep`, `endereco_logradouro`, `endereco_numero`, `endereco_complemento`, `endereco_bairro`, `endereco_cidade` e `endereco_uf`, todas aceitando nulo. Três CHECKs garantem a consistência:
- o CEP tem 8 dígitos;
- a UF é uma das 27;
- **tudo ou nada**: ou todos os campos obrigatórios estão preenchidos, ou todos são nulos.

O endereço fica no banco como colunas, mas trafega nos contratos como um objeto `endereco`: completo na criação, `Endereco | null` na leitura e opcional, mas completo quando enviado, no PATCH.
- *Alternativa: tabela `enderecos` separada.* Seria útil se houvesse vários endereços por empresa, o que está fora do escopo. Custaria um join em toda leitura de empresa.
- *Alternativa: coluna `jsonb`.* Perde os CHECKs e a tipagem do Drizzle.

### Responsável como colunas em `clientes`
Colunas `responsavel_nome`, `responsavel_celular` e `responsavel_email`, aceitando nulo, com CHECK de tudo ou nada e CHECK de formato do celular. O responsável não é linha de `usuarios`: não participa de login, papéis nem da unicidade de e-mail (`usuarios_email_unique`).
- *Alternativa: tornar o responsável um usuário.* Foi descartada pelo usuário: o responsável é só contato, e o Dono continua sendo cadastrado à parte.

O contrato de criação passa a ter `responsavel` e perde `nome`. `clienteAtualizarSchema` ganha `responsavel` (completo quando enviado). `clienteSchema` ganha `responsavel: Responsavel | null`.

### Nome do cliente vem do nome fantasia, só na criação
`ClientesService.criar` grava `clientes.nome = empresa.nomeFantasia`. Editar depois o nome fantasia de uma empresa não renomeia o cliente. Um cliente com várias empresas não deve mudar de nome porque uma filial mudou de nome. O PATCH do cliente continua aceitando `nome`, mas o admin não ganha agora um campo para editá-lo.

### Validações em `packages/shared`
Um módulo novo, irmão de `cnpj/`, com:
- `cepSchema`: aceita com ou sem máscara e normaliza para 8 dígitos;
- `ufSchema`: aceita minúsculas e normaliza para maiúsculas;
- `celularSchema`: aceita com ou sem máscara e normaliza para 11 dígitos. Exige um DDD da lista oficial da Anatel e o 9 como terceiro dígito;
- os formatadores `formatarCep` e `formatarCelular`.

O admin usa os mesmos schemas na server action, então os erros aparecem junto aos campos antes de chamar a API.

### Busca de CEP num Route Handler do admin
`GET /api/cep/[cep]` no Next do admin. Ele exige a sessão da equipe e consulta o ViaCEP (`https://viacep.com.br/ws/<cep>/json/`) pelo servidor, com timeout de 3 s. A resposta é normalizada para `{ logradouro, bairro, cidade, uf }`, ou 404 quando o CEP não existe (`{"erro": true}` do ViaCEP), ou 502 quando o serviço falha. No formulário, um componente cliente chama essa rota quando o CEP chega a 8 dígitos, preenche os campos vazios ou ainda não editados à mão, move o foco para o número e mostra um aviso em caso de 404 ou 502. A URL base vem de `CEP_API_URL` (com padrão ViaCEP) para os E2E apontarem para um serviço falso.
- *Alternativa: chamar o ViaCEP direto do navegador.* É mais simples, mas espalha a dependência externa pelo cliente e não deixa trocar o provedor por configuração.
- *Alternativa: rota na API NestJS.* A busca é só uma conveniência de tela, sem regra de negócio, e colocá-la na API traria uma dependência externa para o serviço central sem ganho. Se o gestor ou o PDV precisarem depois, ela migra para a API.

### Registros antigos
Não há backfill. O admin mostra "Endereço não cadastrado" e "Responsável não cadastrado" com o atalho para editar. O formulário de edição da empresa sempre exige e envia o endereço completo, então salvar uma edição completa o cadastro. Ações que mandam só `ativa` (inativar ou reativar) continuam funcionando sem endereço.

## Risks / Trade-offs

- [O ViaCEP fica fora do ar ou limita requisições] → Timeout curto, aviso na tela e preenchimento manual sempre possível. O provedor pode ser trocado por `CEP_API_URL`.
- [O CEP genérico de cidade pequena volta sem logradouro e sem bairro] → Esses campos ficam vazios e editáveis, e a validação obriga preenchê-los.
- [Quebra do contrato `POST /admin/clientes`] → O único consumidor é o próprio admin, alterado na mesma mudança. Os testes de integração cobrem o contrato novo.
- [Registros antigos incompletos por tempo indeterminado] → Ficam visíveis no admin com o aviso "não cadastrado". A obrigatoriedade no banco pode vir numa mudança futura, depois de completar os dados.
- [Celular só de padrão brasileiro] → É o público do produto. Um telefone estrangeiro fica fora do escopo.

## Migration Plan

1. Alterar `packages/db/src/schema` e gerar a migration `0003` com `pnpm db:generate`: as colunas aceitando nulo e os CHECKs.
2. `pnpm db:migrate`. Não há passo de dados, porque os registros antigos ficam com nulo, o que os CHECKs de tudo ou nada aceitam.
3. Implantar a API e o admin juntos, por causa da mudança do contrato.
4. Rollback: reverter o deploy. As colunas podem ficar no banco sem efeito, ou ser removidas numa migration de reversão.
