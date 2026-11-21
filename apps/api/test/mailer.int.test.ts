import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SmtpMailer } from "../src/email/mailer";

// Mesma imagem do docker-compose.yml.
const IMAGEM_MAILPIT = "axllent/mailpit:v1.34.0";

describe("SmtpMailer (integração com Mailpit)", () => {
  let mailpit: StartedTestContainer;
  let api: string;

  beforeAll(async () => {
    mailpit = await new GenericContainer(IMAGEM_MAILPIT)
      .withExposedPorts(1025, 8025)
      .withWaitStrategy(Wait.forHttp("/readyz", 8025))
      .start();
    api = `http://${mailpit.getHost()}:${mailpit.getMappedPort(8025)}/api/v1`;
  }, 180_000);

  afterAll(async () => {
    await mailpit?.stop();
  });

  it("entrega a mensagem ao servidor SMTP", async () => {
    const smtp = `smtp://${mailpit.getHost()}:${mailpit.getMappedPort(1025)}`;
    const mailer = new SmtpMailer(smtp, "Super PDV <nao-responda@superpdv.local>");

    await mailer.enviar({
      para: "ana@silva.com.br",
      assunto: "Redefinição de senha",
      texto: "Use o link para redefinir.",
      html: "<p>Use o link para redefinir.</p>",
    });

    const lista = (await (await fetch(`${api}/messages`)).json()) as {
      messages: {
        ID: string;
        Subject: string;
        To: { Address: string }[];
        From: { Address: string };
      }[];
    };
    expect(lista.messages).toHaveLength(1);
    const [msg] = lista.messages;
    expect(msg!.Subject).toBe("Redefinição de senha");
    expect(msg!.To[0]!.Address).toBe("ana@silva.com.br");
    expect(msg!.From.Address).toBe("nao-responda@superpdv.local");

    const completa = (await (await fetch(`${api}/message/${msg!.ID}`)).json()) as { Text: string };
    expect(completa.Text).toContain("Use o link para redefinir.");
  });
});
