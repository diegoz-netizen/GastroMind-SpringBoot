-- ============================================================
-- Migración 002 (14/10/2026): tablas de HU-03 y HU-04 (HL-037)
-- Estaban solo en docs/HU-03/ y docs/HU-04/ y no en script_database.sql:
-- una BD creada siguiendo el README no las tenía (desactivar empleado y
-- recuperar contraseña respondían 500). Si Hibernate ya las creó con
-- ddl-auto=update, esta migración no cambia nada.
-- Una BD nueva NO la necesita: script_database.sql ya trae estas tablas.
-- Se puede correr más de una vez sin error (IF NOT EXISTS).
--
-- Uso:  psql -U postgres -d gastromind_demo -f docs/migraciones/002_tablas_HU03_HU04.sql
-- ============================================================

BEGIN;

-- HU-03: historial de cambios de estado de cada empleado
CREATE TABLE IF NOT EXISTS historial_estado_empleado (
    id               SERIAL PRIMARY KEY,
    empleado_id      INT NOT NULL REFERENCES empleado(id),
    estado_anterior  VARCHAR(20) NOT NULL CHECK (estado_anterior IN ('ACTIVO', 'INACTIVO')),
    estado_nuevo     VARCHAR(20) NOT NULL CHECK (estado_nuevo IN ('ACTIVO', 'INACTIVO')),
    cambiado_por     INT NOT NULL REFERENCES empleado(id),
    fecha_cambio     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_empleado_restaurante ON empleado(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_historial_estado_empleado ON historial_estado_empleado(empleado_id);

-- HU-04: enlaces de recuperación de contraseña (CA-04: caducan y son de un solo uso)
CREATE TABLE IF NOT EXISTS token_recuperacion (
    id           SERIAL PRIMARY KEY,
    empleado_id  INT NOT NULL REFERENCES empleado(id),
    token_hash   VARCHAR(64) NOT NULL UNIQUE,
    expira_en    TIMESTAMP NOT NULL,
    usado_en     TIMESTAMP,
    creado_en    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_token_recuperacion_empleado ON token_recuperacion(empleado_id);

COMMIT;
