-- Isolamento entre clientes (Row Level Security).
--
-- A aplicação acessa as tabelas de clientes no papel restrito `superpdv_app`
-- (sem BYPASSRLS), dentro de uma transação com:
--   SET LOCAL ROLE superpdv_app;
--   SELECT set_config('app.tenant_id', '<uuid do cliente>', true);
-- Sem `app.tenant_id` definido, a política avalia NULL e nenhuma linha é visível.
-- O dono das tabelas (conexão da aplicação) não é afetado pelo RLS (sem FORCE):
-- é o caminho privilegiado usado só pela autenticação, pelo admin e pela CLI.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'superpdv_app') THEN
    CREATE ROLE superpdv_app NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;
--> statement-breakpoint
GRANT superpdv_app TO CURRENT_USER;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO superpdv_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON empresas, usuarios TO superpdv_app;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON usuario_empresas TO superpdv_app;
--> statement-breakpoint
CREATE POLICY isolamento_cliente ON empresas
  AS PERMISSIVE FOR ALL TO superpdv_app
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY isolamento_cliente ON usuarios
  AS PERMISSIVE FOR ALL TO superpdv_app
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY isolamento_cliente ON usuario_empresas
  AS PERMISSIVE FOR ALL TO superpdv_app
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
