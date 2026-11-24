// Portas próprias dos E2E do gestor: os testes nunca reaproveitam o gestor (3000)
// nem a API (3333) de desenvolvimento, que podem estar desatualizados ou sem a
// configuração dos testes (ex.: limite de logins por minuto).
export const PORTA_GESTOR = 3100;
export const PORTA_API = 3434;
export const URL_GESTOR = `http://localhost:${PORTA_GESTOR}`;
export const URL_API = `http://localhost:${PORTA_API}`;
