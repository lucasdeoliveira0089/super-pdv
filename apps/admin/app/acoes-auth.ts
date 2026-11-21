"use server";

import { acoesDeFormulario, CONFIG_ADMIN, type EstadoFormulario } from "@super-pdv/web-session";
import { cookies } from "next/headers";

const acoes = async () => acoesDeFormulario(CONFIG_ADMIN, await cookies());

export async function entrar(estado: EstadoFormulario, fd: FormData) {
  return (await acoes()).entrar(estado, fd);
}
export async function sair() {
  return (await acoes()).sair();
}
export async function trocarSenha(estado: EstadoFormulario, fd: FormData) {
  return (await acoes()).trocarSenha(estado, fd);
}
export async function solicitarRecuperacao(estado: EstadoFormulario, fd: FormData) {
  return (await acoes()).solicitarRecuperacao(estado, fd);
}
export async function confirmarRecuperacao(estado: EstadoFormulario, fd: FormData) {
  return (await acoes()).confirmarRecuperacao(estado, fd);
}
