import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import {
  type MembroEquipe,
  membroEquipeAtualizarSchema,
  type MembroEquipeAtualizar,
  type MembroEquipeCriadoResponse,
  membroEquipeCriarSchema,
  type MembroEquipeCriar,
  type SenhaTemporariaResponse,
} from "@super-pdv/shared";
import { DominioEquipe, MembroAtual } from "../auth/decoradores";
import { ZodPipe } from "../comum/zod.pipe";
import type { MembroAutenticado } from "../contexto/contexto";
import { EquipeService } from "./equipe.service";

@Controller("admin/equipe")
@DominioEquipe()
export class EquipeController {
  constructor(private readonly equipe: EquipeService) {}

  @Get()
  listar(): Promise<MembroEquipe[]> {
    return this.equipe.listar();
  }

  @Post()
  criar(
    @Body(new ZodPipe(membroEquipeCriarSchema)) corpo: MembroEquipeCriar,
  ): Promise<MembroEquipeCriadoResponse> {
    return this.equipe.criar(corpo);
  }

  @Patch(":id")
  atualizar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(membroEquipeAtualizarSchema)) corpo: MembroEquipeAtualizar,
    @MembroAtual() membro: MembroAutenticado,
  ): Promise<MembroEquipe> {
    return this.equipe.atualizar(id, corpo, membro.id);
  }

  @Post(":id/redefinir-senha")
  @HttpCode(200)
  redefinirSenha(@Param("id", ParseUUIDPipe) id: string): Promise<SenhaTemporariaResponse> {
    return this.equipe.redefinirSenha(id);
  }
}
