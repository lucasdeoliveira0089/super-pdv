import { Global, Injectable, Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";
import type { Env } from "../config/env";

export interface MensagemEmail {
  para: string;
  assunto: string;
  texto: string;
  html: string;
}

/** Envio de e-mails. Em produção: SMTP; nos testes: memória. */
export abstract class Mailer {
  abstract enviar(mensagem: MensagemEmail): Promise<void>;
}

/** Envio por SMTP (qualquer provedor). Em desenvolvimento, o Mailpit captura tudo. */
export class SmtpMailer extends Mailer {
  private readonly transporte: Transporter;

  constructor(
    smtpUrl: string,
    private readonly remetente: string,
  ) {
    super();
    this.transporte = createTransport(smtpUrl);
  }

  async enviar(m: MensagemEmail): Promise<void> {
    await this.transporte.sendMail({
      from: this.remetente,
      to: m.para,
      subject: m.assunto,
      text: m.texto,
      html: m.html,
    });
  }
}

/** Guarda os e-mails em memória (testes). */
@Injectable()
export class MailerEmMemoria extends Mailer {
  readonly enviados: MensagemEmail[] = [];

  async enviar(m: MensagemEmail): Promise<void> {
    this.enviados.push(m);
  }

  ultimoPara(email: string): MensagemEmail | undefined {
    return this.enviados.filter((m) => m.para === email).at(-1);
  }
}

@Global()
@Module({
  providers: [
    {
      provide: Mailer,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        Logger.log(`E-mails via ${new URL(config.get("SMTP_URL")).host}`, "Mailer");
        return new SmtpMailer(config.get("SMTP_URL"), config.get("MAIL_FROM"));
      },
    },
  ],
  exports: [Mailer],
})
export class MailerModule {}
