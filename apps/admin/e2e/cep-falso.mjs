// Serviço de CEP falso para os E2E, no formato do ViaCEP (`/ws/<cep>/json/`).
// Os testes não dependem do serviço real nem de internet.
import { createServer } from "node:http";

const PORTA = Number(process.env.PORTA ?? 3901);

/** CEPs conhecidos pelos testes. */
const ENDERECOS = {
  "01310100": {
    cep: "01310-100",
    logradouro: "Avenida Paulista",
    bairro: "Bela Vista",
    localidade: "São Paulo",
    uf: "SP",
  },
  20040002: {
    cep: "20040-002",
    logradouro: "Rua da Assembleia",
    bairro: "Centro",
    localidade: "Rio de Janeiro",
    uf: "RJ",
  },
};
/** CEP que simula o serviço fora do ar. */
const CEP_COM_FALHA = "88888888";

createServer((req, res) => {
  if (req.url === "/saude") return res.writeHead(200).end("ok");
  const cep = /^\/ws\/(\d{8})\/json\/?$/.exec(req.url ?? "")?.[1];
  if (!cep) return res.writeHead(400).end();
  if (cep === CEP_COM_FALHA) return res.writeHead(503).end();
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(ENDERECOS[cep] ?? { erro: "true" }));
}).listen(PORTA, () => console.log(`CEP falso em http://localhost:${PORTA}/ws`));
