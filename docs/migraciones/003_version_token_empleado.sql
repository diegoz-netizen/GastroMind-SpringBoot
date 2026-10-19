-- ============================================================
-- Migración 003 (14/10/2026): HL-035, invalidar sesiones al cambiar la contraseña
-- empleado.version_token va dentro del JWT. Al restablecer la contraseña sube en 1
-- y Spring y Django rechazan los tokens emitidos antes (versión distinta).
-- Una BD nueva NO la necesita: script_database.sql ya trae la columna.
-- Se puede correr más de una vez sin error (IF NOT EXISTS).
--
-- Uso:  psql -U postgres -d gastromind_demo -f docs/migraciones/003_version_token_empleado.sql
-- ============================================================

BEGIN;

ALTER TABLE empleado ADD COLUMN IF NOT EXISTS version_token INT NOT NULL DEFAULT 0;

COMMIT;
