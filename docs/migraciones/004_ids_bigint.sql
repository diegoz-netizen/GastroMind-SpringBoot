-- ============================================================
-- Migración 004 (14/10/2026): ids y FK a BIGINT (punto 4 de la Planning 2)
-- Las entidades de Spring usan Long (bigint) y el script usaba SERIAL/INT (integer).
-- Con ddl-auto=update Hibernate cambiaba solo las tablas que conoce, así que cada BD
-- quedaba mezclada. Desde ahora el script + docs/migraciones/ son el único dueño del
-- esquema y Spring arranca con ddl-auto=validate.
--
-- Pasa a bigint todo "id" que sea PK y toda columna que sea FK, y sus secuencias.
-- Sirve igual para una BD toda en integer o ya mezclada (las que ya son bigint no
-- cambian). Una BD nueva NO la necesita: script_database.sql ya viene en BIGINT.
-- Se puede correr más de una vez sin error.
--
-- Uso:  psql -U postgres -d gastromind_demo -f docs/migraciones/004_ids_bigint.sql
-- ============================================================

BEGIN;

DO $$
DECLARE
    col RECORD;
    seq TEXT;
BEGIN
    FOR col IN
        SELECT DISTINCT c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.key_column_usage k
          ON k.table_schema = c.table_schema AND k.table_name = c.table_name AND k.column_name = c.column_name
        JOIN information_schema.table_constraints t
          ON t.constraint_schema = k.constraint_schema AND t.constraint_name = k.constraint_name
        WHERE c.table_schema = 'public'
          AND c.data_type = 'integer'
          AND (t.constraint_type = 'FOREIGN KEY' OR (t.constraint_type = 'PRIMARY KEY' AND c.column_name = 'id'))
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE BIGINT', col.table_name, col.column_name);
    END LOOP;

    -- Las secuencias de SERIAL son "AS integer": sin esto el id seguiría topado en 2 147 483 647
    FOR seq IN
        SELECT format('%I.%I', s.schemaname, s.sequencename)
        FROM pg_sequences s
        WHERE s.schemaname = 'public' AND s.data_type = 'integer'::regtype
    LOOP
        EXECUTE format('ALTER SEQUENCE %s AS BIGINT', seq);
    END LOOP;
END $$;

-- Variables de los triggers (mismo cuerpo que script_database.sql, con BIGINT)
CREATE OR REPLACE FUNCTION fn_valida_receta_mismo_restaurante()
RETURNS TRIGGER AS $$
DECLARE
    restaurante_producto BIGINT;
    restaurante_ingrediente BIGINT;
BEGIN
    SELECT c.restaurante_id INTO restaurante_producto
    FROM producto p JOIN categoria c ON p.categoria_id = c.id
    WHERE p.id = NEW.producto_id;

    SELECT restaurante_id INTO restaurante_ingrediente
    FROM ingrediente WHERE id = NEW.ingrediente_id;

    IF restaurante_producto IS DISTINCT FROM restaurante_ingrediente THEN
        RAISE EXCEPTION 'El producto % y el insumo % pertenecen a restaurantes distintos', NEW.producto_id, NEW.ingrediente_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_valida_proveedor_insumo_mismo_restaurante()
RETURNS TRIGGER AS $$
DECLARE
    restaurante_proveedor BIGINT;
    restaurante_ingrediente BIGINT;
BEGIN
    SELECT restaurante_id INTO restaurante_proveedor
    FROM proveedor WHERE id = NEW.proveedor_id;

    SELECT restaurante_id INTO restaurante_ingrediente
    FROM ingrediente WHERE id = NEW.ingrediente_id;

    IF restaurante_proveedor IS DISTINCT FROM restaurante_ingrediente THEN
        RAISE EXCEPTION 'El proveedor % y el insumo % pertenecen a restaurantes distintos', NEW.proveedor_id, NEW.ingrediente_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
