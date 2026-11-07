-- ============================================================
-- Migración 009 (07/11/2026): HU-30, conteo físico
--
-- conteo_ciclico guarda, además de lo contado, el stock que tenía el sistema
-- en ese momento. Así la diferencia queda registrada aunque el stock cambie
-- después (CA-30), y el reporte teórico contra real (HU-20) la puede sumar.
-- Lo contado no puede ser negativo (0 = se acabó).
--
-- Una BD nueva NO la necesita: script_database.sql ya trae la columna.
-- Se puede correr más de una vez sin error.
--
-- Uso:  psql -U postgres -d gastromind_demo -f docs/migraciones/009_conteo_stock_sistema.sql
-- ============================================================

BEGIN;

ALTER TABLE conteo_ciclico ADD COLUMN IF NOT EXISTS stock_sistema DECIMAL(10,3);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_conteo_no_negativo') THEN
        ALTER TABLE conteo_ciclico ADD CONSTRAINT chk_conteo_no_negativo CHECK (cantidad_fisica_contada >= 0);
    END IF;
END $$;

COMMIT;
