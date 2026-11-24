ALTER TABLE "clientes" ADD COLUMN "responsavel_nome" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "responsavel_celular" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "responsavel_email" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "endereco_cep" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "endereco_logradouro" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "endereco_numero" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "endereco_complemento" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "endereco_bairro" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "endereco_cidade" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "endereco_uf" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_responsavel_completo" CHECK (("clientes"."responsavel_nome" IS NULL AND "clientes"."responsavel_celular" IS NULL AND "clientes"."responsavel_email" IS NULL)
        OR ("clientes"."responsavel_nome" IS NOT NULL AND "clientes"."responsavel_celular" IS NOT NULL AND "clientes"."responsavel_email" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_responsavel_celular_formato" CHECK ("clientes"."responsavel_celular" ~ '^[0-9]{2}9[0-9]{8}$');--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_endereco_cep_formato" CHECK ("empresas"."endereco_cep" ~ '^[0-9]{8}$');--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_endereco_uf_valida" CHECK ("empresas"."endereco_uf" IN ('AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'));--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_endereco_completo" CHECK (("empresas"."endereco_cep" IS NULL AND "empresas"."endereco_logradouro" IS NULL AND "empresas"."endereco_numero" IS NULL
          AND "empresas"."endereco_complemento" IS NULL AND "empresas"."endereco_bairro" IS NULL
          AND "empresas"."endereco_cidade" IS NULL AND "empresas"."endereco_uf" IS NULL)
        OR ("empresas"."endereco_cep" IS NOT NULL AND "empresas"."endereco_logradouro" IS NOT NULL
          AND "empresas"."endereco_numero" IS NOT NULL AND "empresas"."endereco_bairro" IS NOT NULL
          AND "empresas"."endereco_cidade" IS NOT NULL AND "empresas"."endereco_uf" IS NOT NULL));