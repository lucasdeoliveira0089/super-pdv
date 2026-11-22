// Sessão web (BFF) compartilhada pelo admin e pelo gestor. Uso exclusivo no servidor do Next.
export { acoesDeSessao, falha, type ResultadoAcao } from "./acoes";
export { ClienteApi, ErroDaApi } from "./cliente-api";
export { apiUrl, CONFIG_ADMIN, CONFIG_GESTOR, type ConfigSessao } from "./config";
export {
  type ArmazemCookies,
  expiracaoDoToken,
  gravarTokens,
  limparTokens,
  opcoesCookie,
  precisaRenovar,
} from "./cookies";
export { acoesDeFormulario } from "./acoes-formulario";
export {
  destinoSeguro,
  errosDoZod,
  type EstadoFormulario,
  estadoDeFalha,
  textos,
} from "./formularios";
export { carregar } from "./navegacao";
export { COOKIE_MENU } from "./constantes";
