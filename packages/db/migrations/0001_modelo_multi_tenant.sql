CREATE TYPE "public"."dominio_auth" AS ENUM('cliente', 'equipe');--> statement-breakpoint
CREATE TYPE "public"."papel" AS ENUM('dono', 'administrador', 'gerente', 'operador');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cnpj" text NOT NULL,
	"razao_social" text NOT NULL,
	"nome_fantasia" text NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresas_cnpj_unique" UNIQUE("cnpj"),
	CONSTRAINT "empresas_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "empresas_cnpj_formato" CHECK ("empresas"."cnpj" ~ '^[0-9A-Z]{12}[0-9]{2}$')
);
--> statement-breakpoint
ALTER TABLE "empresas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "equipe_membros" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"senha_temporaria" boolean DEFAULT true NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipe_membros_email_unique" UNIQUE("email"),
	CONSTRAINT "equipe_membros_email_minusculo" CHECK ("equipe_membros"."email" = lower("equipe_membros"."email"))
);
--> statement-breakpoint
CREATE TABLE "login_throttle" (
	"dominio" "dominio_auth" NOT NULL,
	"email" text NOT NULL,
	"falhas" integer DEFAULT 0 NOT NULL,
	"janela_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"bloqueado_ate" timestamp with time zone,
	CONSTRAINT "login_throttle_dominio_email_pk" PRIMARY KEY("dominio","email")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"dominio" "dominio_auth" NOT NULL,
	"usuario_id" uuid,
	"membro_id" uuid,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_tokenHash_unique" UNIQUE("token_hash"),
	CONSTRAINT "password_resets_sujeito_unico" CHECK ((dominio = 'cliente' AND usuario_id IS NOT NULL AND membro_id IS NULL)
     OR (dominio = 'equipe' AND membro_id IS NOT NULL AND usuario_id IS NULL))
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"usado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"dominio" "dominio_auth" NOT NULL,
	"usuario_id" uuid,
	"membro_id" uuid,
	"expira_em" timestamp with time zone NOT NULL,
	"revogada_em" timestamp with time zone,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessoes_sujeito_unico" CHECK ((dominio = 'cliente' AND usuario_id IS NOT NULL AND membro_id IS NULL)
     OR (dominio = 'equipe' AND membro_id IS NOT NULL AND usuario_id IS NULL))
);
--> statement-breakpoint
CREATE TABLE "usuario_empresas" (
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	CONSTRAINT "usuario_empresas_usuario_id_empresa_id_pk" PRIMARY KEY("usuario_id","empresa_id")
);
--> statement-breakpoint
ALTER TABLE "usuario_empresas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"senha_temporaria" boolean DEFAULT true NOT NULL,
	"papel" "papel" NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email"),
	CONSTRAINT "usuarios_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "usuarios_email_minusculo" CHECK ("usuarios"."email" = lower("usuarios"."email"))
);
--> statement-breakpoint
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_tenant_id_clientes_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_membro_id_equipe_membros_id_fk" FOREIGN KEY ("membro_id") REFERENCES "public"."equipe_membros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_sessao_id_sessoes_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_membro_id_equipe_membros_id_fk" FOREIGN KEY ("membro_id") REFERENCES "public"."equipe_membros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_empresas" ADD CONSTRAINT "usuario_empresas_usuario_fk" FOREIGN KEY ("tenant_id","usuario_id") REFERENCES "public"."usuarios"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_empresas" ADD CONSTRAINT "usuario_empresas_empresa_fk" FOREIGN KEY ("tenant_id","empresa_id") REFERENCES "public"."empresas"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_clientes_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "empresas_tenant_id_idx" ON "empresas" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_sessao_idx" ON "refresh_tokens" USING btree ("sessao_id");--> statement-breakpoint
CREATE INDEX "sessoes_usuario_idx" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "sessoes_membro_idx" ON "sessoes" USING btree ("membro_id");--> statement-breakpoint
CREATE INDEX "usuario_empresas_empresa_idx" ON "usuario_empresas" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "usuarios_tenant_id_idx" ON "usuarios" USING btree ("tenant_id");