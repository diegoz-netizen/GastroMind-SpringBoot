-- ============================================================
-- Migración 005 (28/10/2026): base del Sprint 3, movimientos de inventario
-- (HU-13 descuento, HU-14 ingreso, HU-15 kardex, HU-17/18 mermas)
--
-- 1. Stock y cantidades de inventario a DECIMAL(10,3), la misma precisión que
--    receta_detalle.cantidad_requerida. Con 2 decimales, un descuento de 0,005 kg
--    se redondeaba y el stock dejaba de cuadrar con la receta.
-- 2. Tabla movimiento_inventario: cada cambio de stock deja una fila con la
--    cantidad (con signo: + entra, - sale) y el saldo que quedó. Spring la escribe
--    (InventarioService, junto con ingrediente.stock_actual) y Django la lee.
-- 3. Saldo inicial: un AJUSTE por cada insumo que todavía no tiene movimientos,
--    para que el kardex arranque cuadrado con el stock_actual de cada BD.
--
-- Una BD nueva NO la necesita: script_database.sql ya trae todo (y seed_demo.sql
-- carga el saldo inicial de la demo). Se puede correr más de una vez sin error.
--
-- Uso:  psql -U postgres -d gastromind_demo -f docs/migraciones/005_movimientos_inventario.sql
-- ============================================================

BEGIN;

-- 1. Precisión: los valores reales caben (el máximo pasa de 99 999 999,99 a 9 999 999,999)
ALTER TABLE ingrediente ALTER COLUMN stock_actual TYPE DECIMAL(10,3);
ALTER TABLE ingrediente ALTER COLUMN stock_minimo TYPE DECIMAL(10,3);
ALTER TABLE ingrediente ALTER COLUMN dotacion_cantidad TYPE DECIMAL(10,3);
ALTER TABLE registro_ingreso_proveedor ALTER COLUMN cantidad_recibida TYPE DECIMAL(10,3);
ALTER TABLE registro_merma ALTER COLUMN cantidad TYPE DECIMAL(10,3);
ALTER TABLE conteo_ciclico ALTER COLUMN cantidad_fisica_contada TYPE DECIMAL(10,3);

-- 2. Movimientos (mismo bloque que script_database.sql)
CREATE TABLE IF NOT EXISTS movimiento_inventario (
    id                  BIGSERIAL PRIMARY KEY,
    ingrediente_id      BIGINT NOT NULL REFERENCES ingrediente(id),
    tipo                VARCHAR(20) NOT NULL
        CHECK (tipo IN ('INGRESO', 'CONSUMO', 'MERMA', 'AJUSTE')),
    cantidad            DECIMAL(10,3) NOT NULL,          -- con signo: + entra, - sale
    saldo               DECIMAL(10,3) NOT NULL,          -- stock_actual que quedó después de este movimiento
    empleado_id         BIGINT REFERENCES empleado(id),  -- NULL solo en el saldo inicial que carga una migración
    pedido_detalle_id   BIGINT REFERENCES pedido_detalle(id),
    registro_ingreso_id BIGINT REFERENCES registro_ingreso_proveedor(id),
    registro_merma_id   BIGINT REFERENCES registro_merma(id),
    fecha               TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_movimiento_signo CHECK (
        (tipo = 'INGRESO' AND cantidad > 0)
        OR (tipo IN ('CONSUMO', 'MERMA') AND cantidad < 0)
        OR (tipo = 'AJUSTE' AND cantidad <> 0)
    ),
    -- Cada tipo trae solo su origen: un consumo sale de un platillo servido, un ingreso de una compra, etc.
    CONSTRAINT chk_movimiento_origen CHECK (
        (tipo = 'INGRESO' AND registro_ingreso_id IS NOT NULL AND pedido_detalle_id IS NULL AND registro_merma_id IS NULL)
        OR (tipo = 'CONSUMO' AND pedido_detalle_id IS NOT NULL AND registro_ingreso_id IS NULL AND registro_merma_id IS NULL)
        OR (tipo = 'MERMA' AND registro_merma_id IS NOT NULL AND pedido_detalle_id IS NULL AND registro_ingreso_id IS NULL)
        OR (tipo = 'AJUSTE' AND pedido_detalle_id IS NULL AND registro_ingreso_id IS NULL AND registro_merma_id IS NULL)
    ),
    CONSTRAINT chk_movimiento_empleado CHECK (empleado_id IS NOT NULL OR tipo = 'AJUSTE'),
    -- Un platillo servido descuenta cada insumo una sola vez; una compra o una merma mueven el stock una sola vez
    CONSTRAINT uq_movimiento_consumo UNIQUE (pedido_detalle_id, ingrediente_id),
    CONSTRAINT uq_movimiento_ingreso UNIQUE (registro_ingreso_id),
    CONSTRAINT uq_movimiento_merma UNIQUE (registro_merma_id)
);

CREATE INDEX IF NOT EXISTS idx_movimiento_ingrediente_fecha ON movimiento_inventario(ingrediente_id, fecha);

-- 3. Saldo inicial (no se repite: solo para insumos sin ningún movimiento)
INSERT INTO movimiento_inventario (ingrediente_id, tipo, cantidad, saldo, fecha)
SELECT i.id, 'AJUSTE', i.stock_actual, i.stock_actual, NOW()
FROM ingrediente i
WHERE i.stock_actual <> 0
  AND NOT EXISTS (SELECT 1 FROM movimiento_inventario m WHERE m.ingrediente_id = i.id)
ORDER BY i.id;

COMMIT;
