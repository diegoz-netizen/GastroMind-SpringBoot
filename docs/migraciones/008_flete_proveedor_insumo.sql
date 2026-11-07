-- ============================================================
-- Migración 008 (07/11/2026): HU-22, proveedores con sus precios
--
-- proveedor_insumo suma el flete (lo que cobra el proveedor por traer el pedido).
-- Con dos proveedores del mismo insumo se sugiere el de menor costo total (CA-22):
-- precio unitario x cantidad + flete. 0 = sin flete.
--
-- Una BD nueva NO la necesita: script_database.sql ya trae la columna.
-- Se puede correr más de una vez sin error.
--
-- Uso:  psql -U postgres -d gastromind_demo -f docs/migraciones/008_flete_proveedor_insumo.sql
-- ============================================================

BEGIN;

ALTER TABLE proveedor_insumo ADD COLUMN IF NOT EXISTS flete DECIMAL(10,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_flete_no_negativo') THEN
        ALTER TABLE proveedor_insumo ADD CONSTRAINT chk_flete_no_negativo CHECK (flete >= 0);
    END IF;
END $$;

COMMIT;
