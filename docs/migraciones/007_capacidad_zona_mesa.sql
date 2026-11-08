-- ============================================================
-- Migración 007 (07/11/2026): HU-26, mesas del salón
--
-- mesa suma la capacidad (personas que entran, de 1 a 30) y la zona (Salón, Terraza...).
-- Las mesas que ya existen quedan con 4 personas en el Salón; el administrador las ajusta
-- desde la pantalla Mesas.
--
-- Una BD nueva NO la necesita: script_database.sql ya trae las columnas.
-- Se puede correr más de una vez sin error.
--
-- Uso:  psql -U postgres -d gastromind_demo -f docs/migraciones/007_capacidad_zona_mesa.sql
-- ============================================================

BEGIN;

ALTER TABLE mesa ADD COLUMN IF NOT EXISTS capacidad INT NOT NULL DEFAULT 4;
ALTER TABLE mesa ADD COLUMN IF NOT EXISTS zona VARCHAR(30) NOT NULL DEFAULT 'Salón';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mesa_capacidad') THEN
        ALTER TABLE mesa ADD CONSTRAINT chk_mesa_capacidad CHECK (capacidad BETWEEN 1 AND 30);
    END IF;
END $$;

COMMIT;
