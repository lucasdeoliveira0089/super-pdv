// Conversão entre as linhas do banco e os contratos de empresa e responsável.
// No banco, endereço e responsável são colunas achatadas (e nulas nos registros
// antigos); nos contratos, objetos `endereco` e `responsavel`.
import type { schema } from "@super-pdv/db";
import type { Empresa, EmpresaCriar, Responsavel } from "@super-pdv/shared";

type LinhaEmpresa = typeof schema.empresas.$inferSelect;
type LinhaCliente = typeof schema.clientes.$inferSelect;
type EnderecoValidado = EmpresaCriar["endereco"];
type ResponsavelValidado = NonNullable<Responsavel>;

export function comoEmpresa(e: LinhaEmpresa): Empresa {
  const temEndereco =
    e.enderecoCep !== null &&
    e.enderecoLogradouro !== null &&
    e.enderecoNumero !== null &&
    e.enderecoBairro !== null &&
    e.enderecoCidade !== null &&
    e.enderecoUf !== null;
  return {
    id: e.id,
    clienteId: e.tenantId,
    cnpj: e.cnpj,
    razaoSocial: e.razaoSocial,
    nomeFantasia: e.nomeFantasia,
    ativa: e.ativa,
    endereco: temEndereco
      ? {
          cep: e.enderecoCep!,
          logradouro: e.enderecoLogradouro!,
          numero: e.enderecoNumero!,
          complemento: e.enderecoComplemento,
          bairro: e.enderecoBairro!,
          cidade: e.enderecoCidade!,
          uf: e.enderecoUf!,
        }
      : null,
  };
}

/** Colunas de endereço de `empresas` a partir do endereço já validado. */
export function colunasDoEndereco(endereco: EnderecoValidado) {
  return {
    enderecoCep: endereco.cep,
    enderecoLogradouro: endereco.logradouro,
    enderecoNumero: endereco.numero,
    enderecoComplemento: endereco.complemento,
    enderecoBairro: endereco.bairro,
    enderecoCidade: endereco.cidade,
    enderecoUf: endereco.uf,
  };
}

export function comoResponsavel(c: LinhaCliente): Responsavel | null {
  if (c.responsavelNome === null || c.responsavelCelular === null || c.responsavelEmail === null)
    return null;
  return { nome: c.responsavelNome, celular: c.responsavelCelular, email: c.responsavelEmail };
}

/** Colunas do responsável de `clientes` a partir do responsável já validado. */
export function colunasDoResponsavel(r: ResponsavelValidado) {
  return { responsavelNome: r.nome, responsavelCelular: r.celular, responsavelEmail: r.email };
}
