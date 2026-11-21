import { Injectable } from "@nestjs/common";

/** Fonte de tempo injetável (permite controlar o relógio nos testes). */
@Injectable()
export class Relogio {
  agora(): Date {
    return new Date();
  }
}

/** Relógio manual para testes. */
export class RelogioControlado extends Relogio {
  private atual = new Date();

  override agora(): Date {
    return new Date(this.atual);
  }

  avancar(ms: number): void {
    this.atual = new Date(this.atual.getTime() + ms);
  }

  definir(data: Date): void {
    this.atual = new Date(data);
  }
}

export const MINUTO = 60_000;
export const HORA = 60 * MINUTO;
export const DIA = 24 * HORA;
