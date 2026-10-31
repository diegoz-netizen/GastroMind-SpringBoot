-- ============================================================
-- GASTROMIND — Script de Base de Datos (PostgreSQL)
-- Basado en el modelo ER definido en la planificación Scrum
-- ============================================================

-- ---------- RESTAURANTE ----------
CREATE TABLE restaurante (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL
);

-- ---------- ROL ----------
CREATE TABLE rol (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(50) NOT NULL UNIQUE
        CHECK (nombre IN ('ADMINISTRADOR', 'COCINERO', 'ALMACENERO', 'MOZO'))
);

-- ---------- EMPLEADO ----------
CREATE TABLE empleado (
    id                  BIGSERIAL PRIMARY KEY,
    restaurante_id      BIGINT NOT NULL REFERENCES restaurante(id),
    rol_id              BIGINT NOT NULL REFERENCES rol(id),
    nombre_completo     VARCHAR(150) NOT NULL,
    correo              VARCHAR(150) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    pin_acceso          VARCHAR(255),              -- hash del PIN, opcional
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    fecha_registro      TIMESTAMP NOT NULL DEFAULT NOW(),
    version_token       INT NOT NULL DEFAULT 0          -- HL-035: sube al cambiar la contraseña; invalida los JWT anteriores
);

-- ---------- HISTORIAL_ESTADO_EMPLEADO (HU-03) ----------
CREATE TABLE historial_estado_empleado (
    id               BIGSERIAL PRIMARY KEY,
    empleado_id      BIGINT NOT NULL REFERENCES empleado(id),
    estado_anterior  VARCHAR(20) NOT NULL CHECK (estado_anterior IN ('ACTIVO', 'INACTIVO')),
    estado_nuevo     VARCHAR(20) NOT NULL CHECK (estado_nuevo IN ('ACTIVO', 'INACTIVO')),
    cambiado_por     BIGINT NOT NULL REFERENCES empleado(id),
    fecha_cambio     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- TOKEN_RECUPERACION (HU-04) ----------
-- CA-04: el enlace caduca y es de un solo uso. Se guarda el SHA-256 del token, nunca el token.
CREATE TABLE token_recuperacion (
    id           BIGSERIAL PRIMARY KEY,
    empleado_id  BIGINT NOT NULL REFERENCES empleado(id),
    token_hash   VARCHAR(64) NOT NULL UNIQUE,
    expira_en    TIMESTAMP NOT NULL,
    usado_en     TIMESTAMP,                     -- NULL = sin usar
    creado_en    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- CATEGORIA ----------
CREATE TABLE categoria (
    id              BIGSERIAL PRIMARY KEY,
    restaurante_id  BIGINT NOT NULL REFERENCES restaurante(id),
    nombre          VARCHAR(100) NOT NULL          -- Platos, Bebidas, Postres, Regalos
);

-- ---------- PRODUCTO ----------
CREATE TABLE producto (
    id                  BIGSERIAL PRIMARY KEY,
    categoria_id        BIGINT NOT NULL REFERENCES categoria(id),
    nombre              VARCHAR(150) NOT NULL,
    precio              DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    requiere_receta     BOOLEAN NOT NULL DEFAULT TRUE,
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'INACTIVO'))
);

-- ---------- INGREDIENTE ----------
-- CRITICO multi-tenant: cada insumo pertenece a UN restaurante. Sin esto,
-- el stock de un restaurante se mezclaria con el de otro.
CREATE TABLE ingrediente (
    id                  BIGSERIAL PRIMARY KEY,
    restaurante_id      BIGINT NOT NULL REFERENCES restaurante(id),
    nombre              VARCHAR(150) NOT NULL,
    unidad_medida       VARCHAR(20) NOT NULL,       -- g, ml, unidades, kg, l
    stock_actual        DECIMAL(10,3) NOT NULL DEFAULT 0,   -- 3 decimales, como la receta (migración 005)
    stock_minimo        DECIMAL(10,3) NOT NULL DEFAULT 0,
    costo_unitario      DECIMAL(10,2) NOT NULL CHECK (costo_unitario >= 0),
    tipo_control        VARCHAR(20) NOT NULL DEFAULT 'RECETA'
        CHECK (tipo_control IN ('RECETA', 'LIBRE')),
    dotacion_cantidad   DECIMAL(10,3),               -- solo aplica si tipo_control = 'LIBRE'
    dotacion_periodo    VARCHAR(20)
        CHECK (dotacion_periodo IN ('SEMANAL', 'MENSUAL')),
    CONSTRAINT chk_dotacion_libre CHECK (
        tipo_control = 'RECETA' OR (dotacion_cantidad IS NOT NULL AND dotacion_periodo IS NOT NULL)
    ),
    UNIQUE (restaurante_id, nombre)                 -- no se repite el mismo insumo dos veces en un restaurante
);

-- ---------- RECETA_DETALLE (BOM) ----------
CREATE TABLE receta_detalle (
    id                  BIGSERIAL PRIMARY KEY,
    producto_id         BIGINT NOT NULL REFERENCES producto(id),
    ingrediente_id      BIGINT NOT NULL REFERENCES ingrediente(id),
    cantidad_requerida  DECIMAL(10,3) NOT NULL CHECK (cantidad_requerida > 0),
    UNIQUE (producto_id, ingrediente_id)            -- evita insumo repetido en la misma receta
);

-- ---------- MESA ----------
CREATE TABLE mesa (
    id              BIGSERIAL PRIMARY KEY,
    restaurante_id  BIGINT NOT NULL REFERENCES restaurante(id),
    numero          INT NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'LIBRE'
        CHECK (estado IN ('LIBRE', 'OCUPADA', 'CERRADA')),
    UNIQUE (restaurante_id, numero)
);

-- ---------- PROVEEDOR ----------
-- CRITICO multi-tenant: cada restaurante gestiona su propia lista de proveedores.
CREATE TABLE proveedor (
    id              BIGSERIAL PRIMARY KEY,
    restaurante_id  BIGINT NOT NULL REFERENCES restaurante(id),
    nombre          VARCHAR(150) NOT NULL,
    contacto        VARCHAR(150)
);

-- ---------- PROVEEDOR_INSUMO ----------
-- HU-22: que insumos vende cada proveedor, a que precio y en cuantos dias entrega.
-- Con dos proveedores del mismo insumo se sugiere el de menor costo total (CA-22).
-- Proveedor e insumo deben ser del mismo restaurante (trigger mas abajo).
CREATE TABLE proveedor_insumo (
    id                  BIGSERIAL PRIMARY KEY,
    proveedor_id        BIGINT NOT NULL REFERENCES proveedor(id),
    ingrediente_id      BIGINT NOT NULL REFERENCES ingrediente(id),
    precio_unitario     DECIMAL(10,2) NOT NULL CHECK (precio_unitario > 0),
    tiempo_entrega_dias INT NOT NULL CHECK (tiempo_entrega_dias >= 0),
    UNIQUE (proveedor_id, ingrediente_id)           -- un precio vigente por proveedor e insumo
);

-- ---------- MOTIVO_MERMA ----------
-- Catalogo configurable en vez de CHECK fijo: motivos globales del sistema
-- (restaurante_id NULL) mas motivos propios que cada restaurante puede agregar.
CREATE TABLE motivo_merma (
    id              BIGSERIAL PRIMARY KEY,
    restaurante_id  BIGINT REFERENCES restaurante(id),   -- NULL = motivo global disponible para todos
    nombre          VARCHAR(50) NOT NULL,
    es_global       BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (restaurante_id, nombre)
);

-- ---------- PEDIDO ----------
CREATE TABLE pedido (
    id              BIGSERIAL PRIMARY KEY,
    mesa_id         BIGINT NOT NULL REFERENCES mesa(id),
    empleado_id     BIGINT NOT NULL REFERENCES empleado(id),   -- creado_por: rol Mozo
    estado          VARCHAR(20) NOT NULL DEFAULT 'ABIERTO'
        CHECK (estado IN ('ABIERTO', 'EN_PREPARACION', 'SERVIDO', 'CERRADO')),
    fecha_registro  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- PEDIDO_DETALLE ----------
CREATE TABLE pedido_detalle (
    id              BIGSERIAL PRIMARY KEY,
    pedido_id       BIGINT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    producto_id     BIGINT NOT NULL REFERENCES producto(id),
    cantidad        INT NOT NULL CHECK (cantidad > 0),
    estado          VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'SERVIDO', 'ANULADO'))
);

-- ---------- REGISTRO_MERMA ----------
CREATE TABLE registro_merma (
    id              BIGSERIAL PRIMARY KEY,
    empleado_id     BIGINT NOT NULL REFERENCES empleado(id),   -- creado_por: Cocinero/Almacenero
    ingrediente_id  BIGINT NOT NULL REFERENCES ingrediente(id),
    cantidad        DECIMAL(10,3) NOT NULL CHECK (cantidad > 0),
    motivo_id       BIGINT NOT NULL REFERENCES motivo_merma(id),
    fecha_registro  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- REGISTRO_INGRESO_PROVEEDOR ----------
CREATE TABLE registro_ingreso_proveedor (
    id                  BIGSERIAL PRIMARY KEY,
    empleado_id         BIGINT NOT NULL REFERENCES empleado(id),   -- creado_por: Almacenero
    proveedor_id        BIGINT NOT NULL REFERENCES proveedor(id),
    ingrediente_id      BIGINT NOT NULL REFERENCES ingrediente(id),
    lote                VARCHAR(50),
    fecha_vencimiento   DATE,                       -- HU-16: NULL = no perecible; alerta 3 dias antes
    cantidad_recibida   DECIMAL(10,3) NOT NULL CHECK (cantidad_recibida > 0),
    costo_total         DECIMAL(10,2) NOT NULL CHECK (costo_total >= 0),
    fecha_registro      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- CONTEO_CICLICO ----------
CREATE TABLE conteo_ciclico (
    id                          BIGSERIAL PRIMARY KEY,
    empleado_id                 BIGINT NOT NULL REFERENCES empleado(id),   -- creado_por: Almacenero
    ingrediente_id              BIGINT NOT NULL REFERENCES ingrediente(id),
    cantidad_fisica_contada     DECIMAL(10,3) NOT NULL,
    fecha_registro              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Movimientos de inventario (Sprint 3, migración 005): cada cambio de stock deja una fila con la cantidad
-- (+ entra, - sale) y el saldo que quedó. La escribe Spring (InventarioService) junto con
-- ingrediente.stock_actual, en la misma transacción; Django la lee para el kardex (HU-15).
CREATE TABLE movimiento_inventario (
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

-- ============================================================
-- INTEGRIDAD MULTI-TENANT: un producto de un restaurante NO puede
-- llevar en su receta un insumo de OTRO restaurante. Un CHECK simple
-- no puede comparar dos tablas, por eso se usa un trigger.
-- ============================================================
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

CREATE TRIGGER trg_receta_mismo_restaurante
    BEFORE INSERT OR UPDATE ON receta_detalle
    FOR EACH ROW EXECUTE FUNCTION fn_valida_receta_mismo_restaurante();

-- Mismo control para HU-22: un proveedor solo puede tener precios de insumos de su restaurante.
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

CREATE TRIGGER trg_proveedor_insumo_mismo_restaurante
    BEFORE INSERT OR UPDATE ON proveedor_insumo
    FOR EACH ROW EXECUTE FUNCTION fn_valida_proveedor_insumo_mismo_restaurante();

-- NOTA IMPORTANTE: este trigger es la ultima linea de defensa, no la unica.
-- En el backend (Spring Boot), TODA consulta debe filtrar por restaurante_id
-- obtenido del JWT del usuario logueado -- nunca confiar solo en la BD para esto.

-- ============================================================
-- ÍNDICES recomendados para las FKs más consultadas
-- ============================================================
CREATE INDEX idx_empleado_rol ON empleado(rol_id);
CREATE INDEX idx_empleado_restaurante ON empleado(restaurante_id);
CREATE INDEX idx_historial_estado_empleado ON historial_estado_empleado(empleado_id);
CREATE INDEX idx_token_recuperacion_empleado ON token_recuperacion(empleado_id);
CREATE INDEX idx_ingrediente_restaurante ON ingrediente(restaurante_id);
CREATE INDEX idx_proveedor_restaurante ON proveedor(restaurante_id);
CREATE INDEX idx_producto_categoria ON producto(categoria_id);
CREATE INDEX idx_receta_producto ON receta_detalle(producto_id);
CREATE INDEX idx_receta_ingrediente ON receta_detalle(ingrediente_id);
CREATE INDEX idx_pedido_mesa ON pedido(mesa_id);
CREATE INDEX idx_pedido_empleado ON pedido(empleado_id);
CREATE INDEX idx_merma_ingrediente ON registro_merma(ingrediente_id);
CREATE INDEX idx_merma_motivo ON registro_merma(motivo_id);
CREATE INDEX idx_merma_fecha ON registro_merma(fecha_registro);
CREATE INDEX idx_ingreso_ingrediente ON registro_ingreso_proveedor(ingrediente_id);
CREATE INDEX idx_ingreso_vencimiento ON registro_ingreso_proveedor(fecha_vencimiento);
CREATE INDEX idx_proveedor_insumo_ingrediente ON proveedor_insumo(ingrediente_id);
CREATE INDEX idx_conteo_ingrediente ON conteo_ciclico(ingrediente_id);
CREATE INDEX idx_movimiento_ingrediente_fecha ON movimiento_inventario(ingrediente_id, fecha);

-- ============================================================
-- DATOS INICIALES (seed) — roles fijos del sistema
-- ============================================================
INSERT INTO rol (nombre) VALUES
    ('ADMINISTRADOR'),
    ('COCINERO'),
    ('ALMACENERO'),
    ('MOZO');

-- Motivos de merma globales: disponibles para cualquier restaurante desde el dia 1.
-- Un restaurante puede agregar los suyos propios insertando con su restaurante_id.
INSERT INTO motivo_merma (restaurante_id, nombre, es_global) VALUES
    (NULL, 'QUEMADO', TRUE),
    (NULL, 'DERRAMADO', TRUE),
    (NULL, 'VENCIDO', TRUE),
    (NULL, 'MAL_MANEJO', TRUE),
    (NULL, 'SOBRANTE', TRUE),
    (NULL, 'DEVOLUCION', TRUE),
    (NULL, 'CORTESIA', TRUE),
    (NULL, 'PLATO_ANULADO', TRUE);
