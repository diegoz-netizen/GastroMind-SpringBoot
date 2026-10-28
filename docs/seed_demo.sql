-- ============================================================
-- GASTROMIND — Datos semilla de DEMO (HU-02 Login, HU-05 Insumos, HU-06 Carta y recetas,
-- datos de prueba por rol y de HU-07, y del Sprint 3: mesas, proveedores, compras con
-- vencimiento, pedidos, mermas y el kardex de cada insumo)
-- Ejecutar DESPUES de script_database.sql (los roles ya existen ahi,
-- por eso NO se reinsertan; se referencian por nombre).
--
-- Credenciales demo (solo entorno local/demo):
--   admin.central@gastromind.demo  /  Demo2026!
--   admin.norte@gastromind.demo    /  Demo2026!
--   mozo.central@gastromind.demo, cocina.central@gastromind.demo,
--   almacen.central@gastromind.demo, mozo.norte@gastromind.demo,
--   cocina.norte@gastromind.demo   /  Demo2026!  (uno por rol)
--   mozo.inactivo@gastromind.demo  /  Demo2026!  (INACTIVO: el login lo rechaza)
-- Hash BCrypt (cost 10) generado con BCryptPasswordEncoder de Spring Security.
--
-- Regla del equipo: todo dato de demo, test o Postman va en este archivo,
-- nunca cargado a mano (si no, una BD creada desde el repo queda incompleta).
-- ============================================================

BEGIN;

WITH r1 AS (
    INSERT INTO restaurante (nombre) VALUES ('GastroMind Demo - Sede Central') RETURNING id
), r2 AS (
    INSERT INTO restaurante (nombre) VALUES ('GastroMind Demo - Sede Norte') RETURNING id
)
INSERT INTO empleado (restaurante_id, rol_id, nombre_completo, correo, password_hash, estado)
SELECT r1.id, (SELECT id FROM rol WHERE nombre = 'ADMINISTRADOR'),
       'Administrador Sede Central', 'admin.central@gastromind.demo',
       '$2a$10$cahPqSeDX3.MH6ROtNPAc.rFurkPmsdPwS1wnxF94RZIrb/F5inba', 'ACTIVO'
FROM r1
UNION ALL
SELECT r2.id, (SELECT id FROM rol WHERE nombre = 'ADMINISTRADOR'),
       'Administrador Sede Norte', 'admin.norte@gastromind.demo',
       '$2a$10$cahPqSeDX3.MH6ROtNPAc.rFurkPmsdPwS1wnxF94RZIrb/F5inba', 'ACTIVO'
FROM r2;

-- HU-05: insumos de la demo. Se buscan los restaurantes por nombre (los id
-- dependen del orden de carga) y se insertan en orden fijo. Tomate (Central) y Pescado (Norte) quedan
-- bajo su stock minimo a proposito: muestran la alerta "Bajo minimo".
INSERT INTO ingrediente (restaurante_id, nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario, tipo_control)
SELECT r.id, v.nombre, v.unidad, v.stock, v.minimo, v.costo, 'RECETA'
FROM (VALUES
    (1, 'GastroMind Demo - Sede Central', 'Aceite vegetal', 'l',  6.00,  4.00,  9.90),
    (2, 'GastroMind Demo - Sede Central', 'Pollo',          'kg', 12.00, 8.00,  11.50),
    (3, 'GastroMind Demo - Sede Central', 'Arroz',          'kg', 25.00, 10.00, 3.80),
    (4, 'GastroMind Demo - Sede Central', 'Tomate',         'kg', 2.00,  5.00,  4.50),
    (5, 'GastroMind Demo - Sede Norte',   'Limón',          'kg', 8.00,  3.00,  4.20),
    (6, 'GastroMind Demo - Sede Norte',   'Pescado',        'kg', 3.00,  5.00,  18.00)
) AS v(orden, restaurante, nombre, unidad, stock, minimo, costo)
JOIN restaurante r ON r.nombre = v.restaurante
ORDER BY v.orden;   -- mismo orden (y mismos id en una BD nueva) que la demo

-- HU-06: insumos que usan las recetas de la demo (se agregan despues de los 6 de HU-05,
-- asi esos conservan sus id: la coleccion de Postman y los tests los buscan por nombre).
INSERT INTO ingrediente (restaurante_id, nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario, tipo_control)
SELECT r.id, v.nombre, v.unidad, v.stock, v.minimo, v.costo, 'RECETA'
FROM (VALUES
    (7,  'GastroMind Demo - Sede Central', 'Cebolla roja',  'kg', 10.00, 3.00, 3.20),
    (8,  'GastroMind Demo - Sede Central', 'Papa amarilla', 'kg', 30.00, 8.00, 2.80),
    (9,  'GastroMind Demo - Sede Central', 'Ají amarillo',  'kg', 2.00,  1.00, 12.00),
    (10, 'GastroMind Demo - Sede Central', 'Lomo de res',   'kg', 8.00,  3.00, 38.00),
    (11, 'GastroMind Demo - Sede Norte',   'Cebolla roja',  'kg', 6.00,  2.00, 3.20),
    (12, 'GastroMind Demo - Sede Norte',   'Ají limo',      'kg', 1.00,  0.50, 14.00),
    (13, 'GastroMind Demo - Sede Norte',   'Camote',        'kg', 15.00, 5.00, 2.50)
) AS v(orden, restaurante, nombre, unidad, stock, minimo, costo)
JOIN restaurante r ON r.nombre = v.restaurante
ORDER BY v.orden;

-- HU-06: carta de la demo (categorias y platillos por sede). La chicha no lleva receta.
INSERT INTO categoria (restaurante_id, nombre)
SELECT r.id, v.nombre
FROM (VALUES
    (1, 'GastroMind Demo - Sede Central', 'Fondos'),
    (2, 'GastroMind Demo - Sede Central', 'Bebidas'),
    (3, 'GastroMind Demo - Sede Norte',   'Entradas'),
    (4, 'GastroMind Demo - Sede Norte',   'Bebidas')
) AS v(orden, restaurante, nombre)
JOIN restaurante r ON r.nombre = v.restaurante
ORDER BY v.orden;

INSERT INTO producto (categoria_id, nombre, precio, requiere_receta)
SELECT c.id, v.nombre, v.precio, v.requiere_receta
FROM (VALUES
    (1, 'GastroMind Demo - Sede Central', 'Fondos',   'Arroz con pollo',       22.00, TRUE),
    (2, 'GastroMind Demo - Sede Central', 'Fondos',   'Lomo saltado',          32.00, TRUE),
    (3, 'GastroMind Demo - Sede Central', 'Bebidas',  'Chicha morada (jarra)', 12.00, FALSE),
    (4, 'GastroMind Demo - Sede Norte',   'Entradas', 'Ceviche de pescado',    35.00, TRUE),
    (5, 'GastroMind Demo - Sede Norte',   'Bebidas',  'Limonada',              8.00,  TRUE)
) AS v(orden, restaurante, categoria, nombre, precio, requiere_receta)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN categoria c ON c.restaurante_id = r.id AND c.nombre = v.categoria
ORDER BY v.orden;

-- HU-06: recetas (BOM). Cantidad por porcion, en la unidad del insumo (kg o l).
INSERT INTO receta_detalle (producto_id, ingrediente_id, cantidad_requerida)
SELECT p.id, i.id, v.cantidad
FROM (VALUES
    ('GastroMind Demo - Sede Central', 'Arroz con pollo',    'Arroz',          0.200),
    ('GastroMind Demo - Sede Central', 'Arroz con pollo',    'Pollo',          0.250),
    ('GastroMind Demo - Sede Central', 'Arroz con pollo',    'Aceite vegetal', 0.020),
    ('GastroMind Demo - Sede Central', 'Arroz con pollo',    'Ají amarillo',   0.030),
    ('GastroMind Demo - Sede Central', 'Arroz con pollo',    'Cebolla roja',   0.050),
    ('GastroMind Demo - Sede Central', 'Lomo saltado',       'Lomo de res',    0.200),
    ('GastroMind Demo - Sede Central', 'Lomo saltado',       'Tomate',         0.100),
    ('GastroMind Demo - Sede Central', 'Lomo saltado',       'Cebolla roja',   0.080),
    ('GastroMind Demo - Sede Central', 'Lomo saltado',       'Papa amarilla',  0.250),
    ('GastroMind Demo - Sede Central', 'Lomo saltado',       'Aceite vegetal', 0.030),
    ('GastroMind Demo - Sede Central', 'Lomo saltado',       'Arroz',          0.150),
    ('GastroMind Demo - Sede Norte',   'Ceviche de pescado', 'Pescado',        0.250),
    ('GastroMind Demo - Sede Norte',   'Ceviche de pescado', 'Limón',          0.150),
    ('GastroMind Demo - Sede Norte',   'Ceviche de pescado', 'Cebolla roja',   0.080),
    ('GastroMind Demo - Sede Norte',   'Ceviche de pescado', 'Ají limo',       0.010),
    ('GastroMind Demo - Sede Norte',   'Ceviche de pescado', 'Camote',         0.150),
    ('GastroMind Demo - Sede Norte',   'Limonada',           'Limón',          0.100)
) AS v(restaurante, producto, insumo, cantidad)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN categoria c ON c.restaurante_id = r.id
JOIN producto p ON p.categoria_id = c.id AND p.nombre = v.producto
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo;

-- Datos de prueba (21/10): un empleado por rol y un INACTIVO, mas casos de HU-07.
-- Este bloque se puede correr solo sobre una BD que ya tiene la demo de arriba:
-- cada INSERT revisa que el dato no exista (se buscan por nombre o correo).

-- Empleados por rol: permisos de cada pantalla (el cocinero consulta la carta pero no la
-- edita, el almacenero registra insumos, el mozo de otra sede no ve lo de Central).
INSERT INTO empleado (restaurante_id, rol_id, nombre_completo, correo, password_hash, estado)
SELECT r.id, (SELECT id FROM rol WHERE nombre = v.rol), v.nombre, v.correo,
       '$2a$10$cahPqSeDX3.MH6ROtNPAc.rFurkPmsdPwS1wnxF94RZIrb/F5inba', v.estado
FROM (VALUES
    (1, 'GastroMind Demo - Sede Central', 'MOZO',       'Mozo Sede Central',       'mozo.central@gastromind.demo',    'ACTIVO'),
    (2, 'GastroMind Demo - Sede Central', 'COCINERO',   'Cocinero Sede Central',   'cocina.central@gastromind.demo',  'ACTIVO'),
    (3, 'GastroMind Demo - Sede Central', 'ALMACENERO', 'Almacenero Sede Central', 'almacen.central@gastromind.demo', 'ACTIVO'),
    (4, 'GastroMind Demo - Sede Central', 'MOZO',       'Mozo Inactivo',           'mozo.inactivo@gastromind.demo',   'INACTIVO'),
    (5, 'GastroMind Demo - Sede Norte',   'MOZO',       'Mozo Sede Norte',         'mozo.norte@gastromind.demo',      'ACTIVO'),
    (6, 'GastroMind Demo - Sede Norte',   'COCINERO',   'Cocinero Sede Norte',     'cocina.norte@gastromind.demo',    'ACTIVO')
) AS v(orden, restaurante, rol, nombre, correo, estado)
JOIN restaurante r ON r.nombre = v.restaurante
WHERE NOT EXISTS (SELECT 1 FROM empleado e WHERE e.correo = v.correo)
ORDER BY v.orden;

-- HU-07: categoria vacia (borrarla da 204; borrar una con platillos da 409).
INSERT INTO categoria (restaurante_id, nombre)
SELECT r.id, 'Postres'
FROM restaurante r
WHERE r.nombre = 'GastroMind Demo - Sede Central'
  AND NOT EXISTS (SELECT 1 FROM categoria c WHERE c.restaurante_id = r.id AND c.nombre = 'Postres');

-- HU-07: platillo INACTIVO con su receta (no sale en ?estado=ACTIVO, pero conserva la receta).
INSERT INTO producto (categoria_id, nombre, precio, requiere_receta, estado)
SELECT c.id, 'Ají de gallina', 26.00, TRUE, 'INACTIVO'
FROM categoria c
JOIN restaurante r ON r.id = c.restaurante_id
WHERE r.nombre = 'GastroMind Demo - Sede Central' AND c.nombre = 'Fondos'
  AND NOT EXISTS (SELECT 1 FROM producto p WHERE p.categoria_id = c.id AND p.nombre = 'Ají de gallina');

INSERT INTO receta_detalle (producto_id, ingrediente_id, cantidad_requerida)
SELECT p.id, i.id, v.cantidad
FROM (VALUES
    ('Pollo',         0.200),
    ('Ají amarillo',  0.040),
    ('Papa amarilla', 0.200),
    ('Arroz',         0.150)
) AS v(insumo, cantidad)
JOIN restaurante r ON r.nombre = 'GastroMind Demo - Sede Central'
JOIN categoria c ON c.restaurante_id = r.id
JOIN producto p ON p.categoria_id = c.id AND p.nombre = 'Ají de gallina'
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE NOT EXISTS (SELECT 1 FROM receta_detalle d WHERE d.producto_id = p.id AND d.ingrediente_id = i.id);

-- ============================================================
-- Sprint 3 (28/10): datos para pedidos, compras, mermas, alertas y kardex
-- (HU-09 a HU-17). Igual que el bloque del 21/10: se puede correr sobre una BD
-- que ya tiene la demo de arriba, y cada INSERT revisa que el dato no exista.
-- El stock_actual de los insumos NO cambia: el kardex se arma hacia atrás, con un
-- saldo inicial (AJUSTE) que hace que la suma de los movimientos dé el stock actual.
-- ============================================================

-- HU-09 / HU-26: mesas del salón. La 3 de Central queda OCUPADA con un pedido en cocina.
INSERT INTO mesa (restaurante_id, numero, estado)
SELECT r.id, v.numero, v.estado
FROM (VALUES
    ('GastroMind Demo - Sede Central', 1, 'LIBRE'),
    ('GastroMind Demo - Sede Central', 2, 'LIBRE'),
    ('GastroMind Demo - Sede Central', 3, 'OCUPADA'),
    ('GastroMind Demo - Sede Central', 4, 'LIBRE'),
    ('GastroMind Demo - Sede Central', 5, 'LIBRE'),
    ('GastroMind Demo - Sede Central', 6, 'LIBRE'),
    ('GastroMind Demo - Sede Central', 7, 'LIBRE'),
    ('GastroMind Demo - Sede Central', 8, 'LIBRE'),
    ('GastroMind Demo - Sede Norte',   1, 'LIBRE'),
    ('GastroMind Demo - Sede Norte',   2, 'LIBRE'),
    ('GastroMind Demo - Sede Norte',   3, 'LIBRE'),
    ('GastroMind Demo - Sede Norte',   4, 'LIBRE'),
    ('GastroMind Demo - Sede Norte',   5, 'LIBRE')
) AS v(restaurante, numero, estado)
JOIN restaurante r ON r.nombre = v.restaurante
WHERE NOT EXISTS (SELECT 1 FROM mesa m WHERE m.restaurante_id = r.id AND m.numero = v.numero)
ORDER BY r.id, v.numero;

-- HU-14 / HU-22: proveedores de cada sede (datos inventados, dominio .demo).
INSERT INTO proveedor (restaurante_id, nombre, contacto)
SELECT r.id, v.nombre, v.contacto
FROM (VALUES
    (1, 'GastroMind Demo - Sede Central', 'Avícola Santa Rosa',            'ventas@avicolasantarosa.demo · 987 654 321'),
    (2, 'GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Sr. Quispe · 912 345 678'),
    (3, 'GastroMind Demo - Sede Central', 'Carnes del Valle',              'pedidos@carnesdelvalle.demo'),
    (4, 'GastroMind Demo - Sede Norte',   'Pescados del Litoral',          'Sra. Huamán · 955 111 222'),
    (5, 'GastroMind Demo - Sede Norte',   'Frutas y Cítricos del Norte',   'ventas@citricosnorte.demo')
) AS v(orden, restaurante, nombre, contacto)
JOIN restaurante r ON r.nombre = v.restaurante
WHERE NOT EXISTS (SELECT 1 FROM proveedor p WHERE p.restaurante_id = r.id AND p.nombre = v.nombre)
ORDER BY v.orden;

-- HU-22: precio y tiempo de entrega de cada proveedor por insumo.
INSERT INTO proveedor_insumo (proveedor_id, ingrediente_id, precio_unitario, tiempo_entrega_dias)
SELECT p.id, i.id, v.precio, v.dias
FROM (VALUES
    ('GastroMind Demo - Sede Central', 'Avícola Santa Rosa',            'Pollo',          11.20, 1),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Tomate',          4.30, 1),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Cebolla roja',    3.00, 1),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Papa amarilla',   2.60, 1),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Arroz',           3.70, 2),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Ají amarillo',   11.50, 1),
    ('GastroMind Demo - Sede Central', 'Carnes del Valle',              'Lomo de res',    37.50, 2),
    ('GastroMind Demo - Sede Norte',   'Pescados del Litoral',          'Pescado',        17.50, 0),
    ('GastroMind Demo - Sede Norte',   'Frutas y Cítricos del Norte',   'Limón',           4.00, 1),
    ('GastroMind Demo - Sede Norte',   'Frutas y Cítricos del Norte',   'Camote',          2.40, 1)
) AS v(restaurante, proveedor, insumo, precio, dias)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN proveedor p ON p.restaurante_id = r.id AND p.nombre = v.proveedor
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE NOT EXISTS (SELECT 1 FROM proveedor_insumo x WHERE x.proveedor_id = p.id AND x.ingrediente_id = i.id);

-- HU-14 / HU-16: compras recibidas. El vencimiento es relativo a HOY, así la alerta siempre
-- tiene algo que mostrar: Pollo vence en 2 días, Pescado mañana y el Tomate ya venció
-- (sale mientras quede stock). Lomo (10 días) y Limón (6) no alertan; el Arroz no vence.
INSERT INTO registro_ingreso_proveedor
    (empleado_id, proveedor_id, ingrediente_id, lote, fecha_vencimiento, cantidad_recibida, costo_total, fecha_registro)
SELECT e.id, p.id, i.id, v.lote, CURRENT_DATE + v.vence_en_dias, v.cantidad, v.costo, NOW() - v.hace
FROM (VALUES
    ('GastroMind Demo - Sede Central', 'almacen.central@gastromind.demo', 'Avícola Santa Rosa',            'Pollo',       'AV-2610',   2,    10.000, 112.00, INTERVAL '2 days'),
    ('GastroMind Demo - Sede Central', 'almacen.central@gastromind.demo', 'Carnes del Valle',              'Lomo de res', 'CV-2510',   10,    5.000, 187.50, INTERVAL '3 days'),
    ('GastroMind Demo - Sede Central', 'almacen.central@gastromind.demo', 'Mercado Mayorista - Puesto 14', 'Tomate',      'MM-2410',   -1,    1.500,   6.45, INTERVAL '4 days'),
    ('GastroMind Demo - Sede Central', 'almacen.central@gastromind.demo', 'Mercado Mayorista - Puesto 14', 'Arroz',       'MM-2510-A', NULL, 20.000,  74.00, INTERVAL '3 days'),
    ('GastroMind Demo - Sede Norte',   'admin.norte@gastromind.demo',     'Pescados del Litoral',          'Pescado',     'PL-2710',   1,     2.500,  43.75, INTERVAL '1 day'),
    ('GastroMind Demo - Sede Norte',   'admin.norte@gastromind.demo',     'Frutas y Cítricos del Norte',   'Limón',       'FC-2610',   6,     5.000,  20.00, INTERVAL '2 days')
) AS v(restaurante, correo, proveedor, insumo, lote, vence_en_dias, cantidad, costo, hace)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN empleado e ON e.correo = v.correo
JOIN proveedor p ON p.restaurante_id = r.id AND p.nombre = v.proveedor
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE NOT EXISTS (SELECT 1 FROM registro_ingreso_proveedor x WHERE x.ingrediente_id = i.id AND x.lote = v.lote);

-- HU-09 a HU-13: pedidos. Mesa 1 de Central y mesa 2 de Norte, ya cerrados (sus platillos
-- servidos descuentan stock); mesa 3 de Central, en cocina (sirve para el KDS de la HU-10).
INSERT INTO pedido (mesa_id, empleado_id, estado, fecha_registro)
SELECT m.id, e.id, v.estado, NOW() - v.hace
FROM (VALUES
    ('GastroMind Demo - Sede Central', 1, 'mozo.central@gastromind.demo', 'CERRADO',        INTERVAL '1 day'),
    ('GastroMind Demo - Sede Central', 3, 'mozo.central@gastromind.demo', 'EN_PREPARACION', INTERVAL '15 minutes'),
    ('GastroMind Demo - Sede Norte',   2, 'mozo.norte@gastromind.demo',   'CERRADO',        INTERVAL '22 hours')
) AS v(restaurante, mesa, correo, estado, hace)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN mesa m ON m.restaurante_id = r.id AND m.numero = v.mesa
JOIN empleado e ON e.correo = v.correo
WHERE NOT EXISTS (SELECT 1 FROM pedido p WHERE p.mesa_id = m.id);

INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, estado)
SELECT p.id, pr.id, v.cantidad, v.estado
FROM (VALUES
    ('GastroMind Demo - Sede Central', 1, 'Lomo saltado',          2, 'SERVIDO'),
    ('GastroMind Demo - Sede Central', 1, 'Arroz con pollo',       1, 'SERVIDO'),
    ('GastroMind Demo - Sede Central', 1, 'Chicha morada (jarra)', 1, 'SERVIDO'),
    ('GastroMind Demo - Sede Central', 3, 'Lomo saltado',          1, 'EN_PREPARACION'),
    ('GastroMind Demo - Sede Central', 3, 'Arroz con pollo',       1, 'PENDIENTE'),
    ('GastroMind Demo - Sede Norte',   2, 'Ceviche de pescado',    2, 'SERVIDO'),
    ('GastroMind Demo - Sede Norte',   2, 'Limonada',              2, 'SERVIDO')
) AS v(restaurante, mesa, producto, cantidad, estado)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN mesa m ON m.restaurante_id = r.id AND m.numero = v.mesa
JOIN pedido p ON p.mesa_id = m.id
JOIN categoria c ON c.restaurante_id = r.id
JOIN producto pr ON pr.categoria_id = c.id AND pr.nombre = v.producto
WHERE NOT EXISTS (SELECT 1 FROM pedido_detalle d WHERE d.pedido_id = p.id AND d.producto_id = pr.id);

-- HU-17: mermas con los motivos globales del script.
INSERT INTO registro_merma (empleado_id, ingrediente_id, cantidad, motivo_id, fecha_registro)
SELECT e.id, i.id, v.cantidad, mm.id, NOW() - v.hace
FROM (VALUES
    ('GastroMind Demo - Sede Central', 'almacen.central@gastromind.demo', 'Tomate',      0.500, 'VENCIDO',    INTERVAL '12 hours'),
    ('GastroMind Demo - Sede Central', 'cocina.central@gastromind.demo',  'Lomo de res', 0.300, 'MAL_MANEJO', INTERVAL '20 hours'),
    ('GastroMind Demo - Sede Norte',   'cocina.norte@gastromind.demo',    'Limón',       0.200, 'DERRAMADO',  INTERVAL '10 hours')
) AS v(restaurante, correo, insumo, cantidad, motivo, hace)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN empleado e ON e.correo = v.correo
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
JOIN motivo_merma mm ON mm.nombre = v.motivo AND mm.es_global
WHERE NOT EXISTS (SELECT 1 FROM registro_merma x WHERE x.ingrediente_id = i.id AND x.motivo_id = mm.id AND x.empleado_id = e.id);

-- HU-15: kardex de la demo. Movimientos de cada compra, de cada platillo servido (receta x cantidad,
-- lo registra el cocinero de la sede) y de cada merma, más un saldo inicial (AJUSTE) que hace que la
-- suma dé el stock_actual. El saldo de cada fila es la suma acumulada, en orden de fecha.
-- Si la migración 005 ya puso un saldo inicial automático en un insumo que ahora tiene historia,
-- se reemplaza por el kardex completo. Un insumo con movimientos reales no se toca.
WITH demo AS (
    SELECT i.id AS ingrediente_id, i.stock_actual
    FROM ingrediente i
    JOIN restaurante r ON r.id = i.restaurante_id
    WHERE r.nombre IN ('GastroMind Demo - Sede Central', 'GastroMind Demo - Sede Norte')
), operaciones AS (
    SELECT x.ingrediente_id, 'INGRESO' AS tipo, x.cantidad_recibida AS cantidad, x.empleado_id,
           NULL::BIGINT AS pedido_detalle_id, x.id AS registro_ingreso_id, NULL::BIGINT AS registro_merma_id,
           x.fecha_registro AS fecha
    FROM registro_ingreso_proveedor x JOIN demo d ON d.ingrediente_id = x.ingrediente_id
    UNION ALL
    SELECT rd.ingrediente_id, 'CONSUMO', -(pd.cantidad * rd.cantidad_requerida),
           (SELECT MIN(e.id) FROM empleado e JOIN rol ro ON ro.id = e.rol_id
            WHERE e.restaurante_id = m.restaurante_id AND ro.nombre = 'COCINERO' AND e.estado = 'ACTIVO'),
           pd.id, NULL, NULL, p.fecha_registro + INTERVAL '40 minutes'
    FROM pedido_detalle pd
    JOIN pedido p ON p.id = pd.pedido_id
    JOIN mesa m ON m.id = p.mesa_id
    JOIN producto pr ON pr.id = pd.producto_id AND pr.requiere_receta
    JOIN receta_detalle rd ON rd.producto_id = pd.producto_id
    JOIN demo d ON d.ingrediente_id = rd.ingrediente_id
    WHERE pd.estado = 'SERVIDO'
    UNION ALL
    SELECT x.ingrediente_id, 'MERMA', -x.cantidad, x.empleado_id, NULL, NULL, x.id, x.fecha_registro
    FROM registro_merma x JOIN demo d ON d.ingrediente_id = x.ingrediente_id
), borrado AS (
    DELETE FROM movimiento_inventario mi
    WHERE mi.tipo = 'AJUSTE' AND mi.empleado_id IS NULL
      AND mi.ingrediente_id IN (SELECT ingrediente_id FROM operaciones)
      AND (SELECT COUNT(*) FROM movimiento_inventario y WHERE y.ingrediente_id = mi.ingrediente_id) = 1
    RETURNING mi.ingrediente_id
), pendientes AS (
    -- Insumos de la demo sin movimientos (o cuyo único movimiento era el saldo automático que se acaba de borrar)
    SELECT d.ingrediente_id, d.stock_actual
    FROM demo d
    WHERE d.ingrediente_id IN (SELECT ingrediente_id FROM borrado)
       OR NOT EXISTS (SELECT 1 FROM movimiento_inventario y WHERE y.ingrediente_id = d.ingrediente_id)
), inicial AS (
    SELECT pe.ingrediente_id, 'AJUSTE' AS tipo,
           pe.stock_actual - COALESCE(SUM(o.cantidad), 0) AS cantidad,
           NULL::BIGINT AS empleado_id, NULL::BIGINT AS pedido_detalle_id,
           NULL::BIGINT AS registro_ingreso_id, NULL::BIGINT AS registro_merma_id,
           COALESCE(MIN(o.fecha), NOW()) - INTERVAL '1 day' AS fecha
    FROM pendientes pe
    LEFT JOIN operaciones o ON o.ingrediente_id = pe.ingrediente_id
    GROUP BY pe.ingrediente_id, pe.stock_actual
), todo AS (
    SELECT i.*, 0 AS orden FROM inicial i WHERE i.cantidad <> 0
    UNION ALL
    SELECT o.*, 1 FROM operaciones o WHERE o.ingrediente_id IN (SELECT ingrediente_id FROM pendientes)
)
INSERT INTO movimiento_inventario
    (ingrediente_id, tipo, cantidad, saldo, empleado_id, pedido_detalle_id, registro_ingreso_id, registro_merma_id, fecha)
SELECT t.ingrediente_id, t.tipo, t.cantidad,
       SUM(t.cantidad) OVER (PARTITION BY t.ingrediente_id ORDER BY t.fecha, t.orden
                             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
       t.empleado_id, t.pedido_detalle_id, t.registro_ingreso_id, t.registro_merma_id, t.fecha
FROM todo t
ORDER BY t.ingrediente_id, t.fecha, t.orden;

COMMIT;
