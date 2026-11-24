# Tasks

## 1. Validações compartilhadas

- [x] 1.1 Criar em `packages/shared` o módulo de endereço e contato. Ele deve ter `cepSchema`, `ufSchema` e `celularSchema` (com normalização) e `formatarCep` e `formatarCelular`, exportados em `src/index.ts`. Verificar com testes Vitest: CEP com e sem máscara, CEP curto, UF minúscula e inexistente, celular com e sem máscara, DDD inválido, fixo sem o 9 e número com dígitos a mais ou a menos.
- [x] 1.2 Atualizar os contratos para:
  - `enderecoSchema` com o complemento opcional e o número como texto;
  - `responsavelSchema`;
  - `empresaCriarSchema` e `empresaAtualizarSchema` com `endereco`;
  - `empresaSchema` com `endereco: Endereco | null`;
  - `clienteCriarSchema` sem `nome` e com `responsavel`;
  - `clienteAtualizarSchema` com `responsavel`;
  - `clienteSchema` com `responsavel: Responsavel | null`.

  Verificar com `contratos.test.ts` cobrindo criação completa, ausência de cada campo obrigatório e PATCH sem endereço.

## 2. Banco de dados

- [x] 2.1 Adicionar em `packages/db/src/schema` as colunas de endereço em `empresas` e as do responsável em `clientes`, todas aceitando nulo. Incluir os CHECKs de formato do CEP, da UF e do celular e os de tudo ou nada. Gerar a migration `0003` com `pnpm db:generate` e verificar que `pnpm db:migrate` aplica num banco com dados do seed.
- [x] 2.2 Cobrir os CHECKs com testes contra o PostgreSQL real (Testcontainers), ao lado de `rls.test.ts`. Verificar que o endereço parcial, o CEP fora do formato, a UF inválida e o responsável parcial são recusados pelo banco, e que as linhas com tudo nulo são aceitas.

## 3. API do admin

- [x] 3.1 Em `ClientesService`, passar a gravar:
  - em `criar`: o nome do cliente a partir de `empresa.nomeFantasia`, o endereço da empresa e o responsável;
  - em `adicionarEmpresa` e `atualizarEmpresa`: o endereço;
  - em `atualizar`: o responsável.

  Devolver `endereco` e `responsavel` (ou `null`) nas leituras. Verificar com `admin-clientes.int.test.ts`:
  - cliente criado com o nome fantasia;
  - recusa sem o celular do responsável, sem deixar resíduos;
  - nova empresa sem número recusada;
  - edição do endereço;
  - inativação de empresa antiga sem endereço;
  - edição do responsável;
  - e-mail do responsável igual ao de um usuário aceito.
- [x] 3.2 Atualizar o seed de desenvolvimento com endereço nas duas empresas de demonstração e um responsável no cliente. Verificar com `seed-dev.int.test.ts` e conferindo o detalhe do cliente de demonstração no admin.

## 4. Admin: busca de CEP

- [x] 4.1 Criar o Route Handler `GET /api/cep/[cep]` no admin, restrito à sessão da equipe, que consulta `CEP_API_URL` (padrão ViaCEP) com timeout de 3 s. Ele devolve o endereço normalizado, 404 para CEP não encontrado, 502 para falha e 400 para CEP inválido. Documentar `CEP_API_URL` no `.env.example` do admin e no README. Verificar com testes Vitest da função de consulta, com `fetch` simulado: sucesso, `{"erro": true}`, timeout e resposta inválida.
- [x] 4.2 Criar o componente de campos de endereço no admin. Ele mostra CEP, logradouro, número, complemento, bairro, cidade e UF. Ao digitar 8 dígitos no CEP, chama a rota, preenche os campos não editados à mão e move o foco para o número; em caso de 404 ou 502, mostra o aviso e deixa preencher à mão. Os erros aparecem junto a cada campo. Verificar nos E2E do grupo 5.

## 5. Admin: telas

- [x] 5.1 Reorganizar o formulário "Novo cliente" nos blocos Empresa, Endereço da empresa, Responsável e Dono, sem "Nome do cliente". Atualizar a server action `criarCliente` com os novos campos e a descrição da página. Verificar com um E2E em `admin.spec.ts`: cadastro com o CEP preenchido pelo serviço falso, cliente listado com o nome fantasia e erro junto ao campo celular quando ele falta.
- [x] 5.2 Incluir o endereço em "Adicionar empresa" e na edição da empresa, com a edição sempre exigindo o endereço completo. Verificar com E2E: nova empresa com endereço, edição do número e empresa sem endereço que só salva depois de completar. Incluir um caso de CEP não encontrado com preenchimento manual.
- [x] 5.3 No detalhe do cliente, mostrar:
  - o responsável, com o celular mascarado e a ação "Editar responsável";
  - o endereço de cada empresa, com o CEP mascarado;
  - os avisos de "não cadastrado" para os registros antigos.

  Criar a tela de edição do responsável. Verificar com E2E que a troca do celular aparece no detalhe.
- [x] 5.4 Configurar o serviço de CEP falso para os E2E do admin (`CEP_API_URL` no Playwright e no CI) e verificar que nenhum teste acessa o ViaCEP real.

## 6. Documentação e verificação final

- [x] 6.1 Atualizar o README com a descrição do cadastro de cliente, a tabela do seed e `CEP_API_URL`. Verificar que os comandos citados rodam como escritos.
- [x] 6.2 Executar `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm format:check` e `openspec validate dados-cadastrais-cliente --strict`, e verificar sucesso local e o CI verde no PR.

## Workflow follow-up

- Arquivar a mudança depois do merge do PR, publicando as specs `client-provisioning` e `organization-structure` atualizadas.
