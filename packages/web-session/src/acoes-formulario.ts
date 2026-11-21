import {
  loginRequestSchema,
  recuperacaoConfirmarRequestSchema,
  recuperacaoRequestSchema,
  trocarSenhaRequestSchema,
} from "@super-pdv/shared";
import { redirect } from "next/navigation";
import { acoesDeSessao } from "./acoes";
import type { ConfigSessao } from "./config";
import type { ArmazemCookies } from "./cookies";
import {
  destinoSeguro,
  errosDoZod,
  type EstadoFormulario,
  estadoDeFalha,
  textos,
} from "./formularios";

const CONFIRMACAO_DIFERENTE = { confirmacao: ["As senhas não conferem"] };

/**
 * Implementação das Server Actions de autenticação (login, troca, recuperação),
 * comum ao admin e ao gestor. Cada app as expõe num arquivo "use server".
 */
export function acoesDeFormulario(config: ConfigSessao, cookies: ArmazemCookies) {
  const sessao = acoesDeSessao(config, cookies);

  return {
    async entrar(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
      const valores = textos(fd, "email");
      const dados = loginRequestSchema.safeParse(textos(fd, "email", "senha"));
      if (!dados.success) return { campos: errosDoZod(dados.error), valores };
      const r = await sessao.entrar(dados.data.email, dados.data.senha);
      if (!r.ok) return estadoDeFalha(r, valores);
      redirect(destinoSeguro(fd.get("next")));
    },

    async sair(): Promise<void> {
      await sessao.sair();
      redirect("/login");
    },

    async trocarSenha(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
      const v = textos(fd, "senhaAtual", "novaSenha", "confirmacao");
      const dados = trocarSenhaRequestSchema.safeParse(v);
      if (!dados.success) return { campos: errosDoZod(dados.error) };
      if (v.novaSenha !== v.confirmacao) return { campos: CONFIRMACAO_DIFERENTE };
      const r = await sessao.trocarSenha(dados.data.senhaAtual, dados.data.novaSenha);
      if (!r.ok) return estadoDeFalha(r);
      redirect("/");
    },

    async solicitarRecuperacao(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
      const valores = textos(fd, "email");
      const dados = recuperacaoRequestSchema.safeParse(valores);
      if (!dados.success) return { campos: errosDoZod(dados.error), valores };
      const r = await sessao.solicitarRecuperacao(dados.data.email);
      if (!r.ok) return estadoDeFalha(r, valores);
      return {
        sucesso:
          "Se o e-mail estiver cadastrado, você receberá em instantes um link para criar uma nova senha. O link vale por 1 hora.",
      };
    },

    async confirmarRecuperacao(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
      const v = textos(fd, "token", "novaSenha", "confirmacao");
      const dados = recuperacaoConfirmarRequestSchema.safeParse(v);
      if (!dados.success) return { campos: errosDoZod(dados.error) };
      if (v.novaSenha !== v.confirmacao) return { campos: CONFIRMACAO_DIFERENTE };
      const r = await sessao.confirmarRecuperacao(dados.data.token, dados.data.novaSenha);
      if (!r.ok) return estadoDeFalha(r);
      redirect("/login?redefinida=1");
    },
  };
}
