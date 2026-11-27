-- ============================================================
-- GASTROMIND — Datos semilla de DEMO (HU-02 Login, HU-05 Insumos, HU-06 Carta y recetas,
-- datos de prueba por rol y de HU-07, y del Sprint 3: mesas, proveedores, compras con
-- vencimiento, pedidos, mermas y el kardex de cada insumo). Es la semilla de los tres
-- programas: Spring y Django leen esta misma base, y la app Kotlin la ve a traves de sus APIs.
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
--   PIN de la app (HU-27): 1234 para mozo, cocina y almacen de las dos sedes
--   Personal del seed (misma clave y PIN): lucia.ramos, carlos.huaman, rosa.quispe (mozos),
--   jorge.mendoza, ana.torres (cocina), miguel.salazar (almacén) de Central; patricia.vega (mozo),
--   sofia.herrera (cocina), luis.paredes (almacén) de Norte; diana.chavez queda INACTIVA. Todos @gastromind.demo
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

-- HU-27 (28/10): PIN 1234 de los empleados de la app, con hash BCrypt (cost 10). Solo si no tienen uno.
UPDATE empleado SET pin_acceso = '$2a$10$JDTxOinYerLvb2WZoyCG.Orj0XS6DCd4/xYwUoih993A8xQpnSR46'
WHERE pin_acceso IS NULL
  AND correo IN ('mozo.central@gastromind.demo', 'cocina.central@gastromind.demo', 'almacen.central@gastromind.demo',
                 'mozo.inactivo@gastromind.demo', 'mozo.norte@gastromind.demo', 'cocina.norte@gastromind.demo');

-- HU-07: categoria Postres (el seed le pone platillos; la categoría vacía de HU-07 es "Promociones").
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

-- HU-09 / HU-26: mesas del salón, con su capacidad y zona. La 3 de Central queda OCUPADA con un pedido en cocina.
INSERT INTO mesa (restaurante_id, numero, estado, capacidad, zona)
SELECT r.id, v.numero, v.estado, v.capacidad, v.zona
FROM (VALUES
    ('GastroMind Demo - Sede Central', 1, 'LIBRE',   2, 'Salón'),
    ('GastroMind Demo - Sede Central', 2, 'LIBRE',   4, 'Salón'),
    ('GastroMind Demo - Sede Central', 3, 'OCUPADA', 4, 'Salón'),
    ('GastroMind Demo - Sede Central', 4, 'LIBRE',   4, 'Salón'),
    ('GastroMind Demo - Sede Central', 5, 'LIBRE',   6, 'Salón'),
    ('GastroMind Demo - Sede Central', 6, 'LIBRE',   4, 'Terraza'),
    ('GastroMind Demo - Sede Central', 7, 'LIBRE',   4, 'Terraza'),
    ('GastroMind Demo - Sede Central', 8, 'LIBRE',   8, 'Terraza'),
    ('GastroMind Demo - Sede Norte',   1, 'LIBRE',   2, 'Salón'),
    ('GastroMind Demo - Sede Norte',   2, 'LIBRE',   4, 'Salón'),
    ('GastroMind Demo - Sede Norte',   3, 'LIBRE',   4, 'Salón'),
    ('GastroMind Demo - Sede Norte',   4, 'LIBRE',   6, 'Salón'),
    ('GastroMind Demo - Sede Norte',   5, 'LIBRE',   4, 'Barra')
) AS v(restaurante, numero, estado, capacidad, zona)
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

-- HU-22: precio, tiempo de entrega y flete de cada proveedor por insumo.
-- El Pollo de la Sede Central tiene dos proveedores (CA-22): con 10 kg sale más barato Avícola
-- (S/ 112,00 contra S/ 117,00) y con 20 kg el Mercado (S/ 222,00 contra S/ 224,00), por el flete.
INSERT INTO proveedor_insumo (proveedor_id, ingrediente_id, precio_unitario, tiempo_entrega_dias, flete)
SELECT p.id, i.id, v.precio, v.dias, v.flete
FROM (VALUES
    ('GastroMind Demo - Sede Central', 'Avícola Santa Rosa',            'Pollo',          11.20, 1,  0.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Pollo',          10.50, 2, 12.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Tomate',          4.30, 1,  0.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Cebolla roja',    3.00, 1,  0.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Papa amarilla',   2.60, 1,  0.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Arroz',           3.70, 2,  0.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Ají amarillo',   11.50, 1,  0.00),
    ('GastroMind Demo - Sede Central', 'Carnes del Valle',              'Lomo de res',    37.50, 2,  5.00),
    ('GastroMind Demo - Sede Norte',   'Pescados del Litoral',          'Pescado',        17.50, 0,  0.00),
    ('GastroMind Demo - Sede Norte',   'Frutas y Cítricos del Norte',   'Limón',           4.00, 1,  0.00),
    ('GastroMind Demo - Sede Norte',   'Frutas y Cítricos del Norte',   'Camote',          2.40, 1,  0.00)
) AS v(restaurante, proveedor, insumo, precio, dias, flete)
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

-- ============================================================
-- Seed (27/11), carta y personal: una carta completa (entradas, fondos, bebidas y postres),
-- más insumos, más personal por rol y más proveedores, para que la web, los reportes y la app
-- se vean como un restaurante real. Va ANTES de la historia de pedidos, que ya usa estos platillos.
-- Los datos de arriba no cambian (la demo de Spring sigue con pollo 12 kg y arroz 25 kg).
-- Se puede correr de nuevo: cada INSERT revisa que el dato no exista.
-- ============================================================

-- Insumos nuevos. "Lavavajilla" es de control LIBRE (dotación semanal, no va en recetas).
INSERT INTO ingrediente (restaurante_id, nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario,
                         tipo_control, dotacion_cantidad, dotacion_periodo)
SELECT r.id, v.nombre, v.unidad, v.stock, v.minimo, v.costo, v.control, v.dotacion, v.periodo
FROM (VALUES
    (1,  'GastroMind Demo - Sede Central', 'Limón',            'kg',       6.000,  3.000,  4.20, 'RECETA', NULL::NUMERIC, NULL),
    (2,  'GastroMind Demo - Sede Central', 'Pescado',          'kg',       4.500,  3.000, 18.00, 'RECETA', NULL, NULL),
    (3,  'GastroMind Demo - Sede Central', 'Culantro',         'kg',       0.800,  0.300,  8.00, 'RECETA', NULL, NULL),
    (4,  'GastroMind Demo - Sede Central', 'Camote',           'kg',       8.000,  3.000,  2.50, 'RECETA', NULL, NULL),
    (5,  'GastroMind Demo - Sede Central', 'Choclo',           'unidades', 18.000, 10.000, 1.50, 'RECETA', NULL, NULL),
    (6,  'GastroMind Demo - Sede Central', 'Queso fresco',     'kg',       2.500,  1.000, 22.00, 'RECETA', NULL, NULL),
    (7,  'GastroMind Demo - Sede Central', 'Leche evaporada',  'l',        6.000,  2.000,  6.50, 'RECETA', NULL, NULL),
    (8,  'GastroMind Demo - Sede Central', 'Huevo',            'unidades', 45.000, 30.000, 0.50, 'RECETA', NULL, NULL),
    (9,  'GastroMind Demo - Sede Central', 'Fideos',           'kg',       7.000,  3.000,  5.50, 'RECETA', NULL, NULL),
    (10, 'GastroMind Demo - Sede Central', 'Espinaca',         'kg',       1.200,  1.000,  6.00, 'RECETA', NULL, NULL),
    (11, 'GastroMind Demo - Sede Central', 'Maíz morado',      'kg',       4.000,  2.000,  7.00, 'RECETA', NULL, NULL),
    (12, 'GastroMind Demo - Sede Central', 'Azúcar',           'kg',       9.000,  4.000,  4.00, 'RECETA', NULL, NULL),
    (13, 'GastroMind Demo - Sede Central', 'Canela',           'kg',       0.400,  0.200, 30.00, 'RECETA', NULL, NULL),
    (14, 'GastroMind Demo - Sede Central', 'Leche condensada', 'kg',       0.800,  1.000, 12.00, 'RECETA', NULL, NULL),
    (15, 'GastroMind Demo - Sede Central', 'Lavavajilla',      'l',        3.000,  2.000,  9.00, 'LIBRE',  2.000, 'SEMANAL'),
    (16, 'GastroMind Demo - Sede Norte',   'Tomate',           'kg',       5.000,  2.000,  4.50, 'RECETA', NULL, NULL),
    (17, 'GastroMind Demo - Sede Norte',   'Arroz',            'kg',      15.000,  5.000,  3.80, 'RECETA', NULL, NULL),
    (18, 'GastroMind Demo - Sede Norte',   'Aceite vegetal',   'l',        4.000,  2.000,  9.90, 'RECETA', NULL, NULL),
    (19, 'GastroMind Demo - Sede Norte',   'Yuca',             'kg',       6.000,  3.000,  2.80, 'RECETA', NULL, NULL)
) AS v(orden, restaurante, nombre, unidad, stock, minimo, costo, control, dotacion, periodo)
JOIN restaurante r ON r.nombre = v.restaurante
WHERE NOT EXISTS (SELECT 1 FROM ingrediente i WHERE i.restaurante_id = r.id AND i.nombre = v.nombre)
ORDER BY v.orden;

-- Categorías nuevas. "Postres" (de arriba) deja de estar vacía; el caso de HU-07 (borrar una
-- categoría vacía da 204) pasa a "Promociones".
INSERT INTO categoria (restaurante_id, nombre)
SELECT r.id, v.nombre
FROM (VALUES
    (1, 'GastroMind Demo - Sede Central', 'Entradas'),
    (2, 'GastroMind Demo - Sede Central', 'Promociones'),
    (3, 'GastroMind Demo - Sede Norte',   'Fondos')
) AS v(orden, restaurante, nombre)
JOIN restaurante r ON r.nombre = v.restaurante
WHERE NOT EXISTS (SELECT 1 FROM categoria c WHERE c.restaurante_id = r.id AND c.nombre = v.nombre)
ORDER BY v.orden;

-- Platillos nuevos. Las gaseosas y el agua se venden tal cual: no llevan receta.
INSERT INTO producto (categoria_id, nombre, precio, requiere_receta)
SELECT c.id, v.nombre, v.precio, v.receta
FROM (VALUES
    (1,  'GastroMind Demo - Sede Central', 'Entradas', 'Papa a la huancaína',         18.00, TRUE),
    (2,  'GastroMind Demo - Sede Central', 'Entradas', 'Causa limeña de pollo',       20.00, TRUE),
    (3,  'GastroMind Demo - Sede Central', 'Entradas', 'Ceviche clásico',             34.00, TRUE),
    (4,  'GastroMind Demo - Sede Central', 'Fondos',   'Tallarines verdes con pollo', 28.00, TRUE),
    (5,  'GastroMind Demo - Sede Central', 'Fondos',   'Pollo a la plancha',          24.00, TRUE),
    (6,  'GastroMind Demo - Sede Central', 'Fondos',   'Chaufa de pollo',             24.00, TRUE),
    (7,  'GastroMind Demo - Sede Central', 'Bebidas',  'Limonada (jarra)',            14.00, TRUE),
    (8,  'GastroMind Demo - Sede Central', 'Bebidas',  'Inca Kola 500 ml',             6.00, FALSE),
    (9,  'GastroMind Demo - Sede Central', 'Bebidas',  'Agua mineral',                 4.00, FALSE),
    (10, 'GastroMind Demo - Sede Central', 'Postres',  'Mazamorra morada',             9.00, TRUE),
    (11, 'GastroMind Demo - Sede Central', 'Postres',  'Arroz con leche',              9.00, TRUE),
    (12, 'GastroMind Demo - Sede Central', 'Postres',  'Suspiro limeño',              12.00, TRUE),
    (13, 'GastroMind Demo - Sede Norte',   'Entradas', 'Leche de tigre',              18.00, TRUE),
    (14, 'GastroMind Demo - Sede Norte',   'Fondos',   'Sudado de pescado',           32.00, TRUE),
    (15, 'GastroMind Demo - Sede Norte',   'Fondos',   'Chicharrón de pescado',       30.00, TRUE),
    (16, 'GastroMind Demo - Sede Norte',   'Bebidas',  'Chicha morada (jarra)',       12.00, FALSE)
) AS v(orden, restaurante, categoria, nombre, precio, receta)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN categoria c ON c.restaurante_id = r.id AND c.nombre = v.categoria
WHERE NOT EXISTS (SELECT 1 FROM producto p JOIN categoria x ON x.id = p.categoria_id
                  WHERE x.restaurante_id = r.id AND p.nombre = v.nombre)
ORDER BY v.orden;

-- Recetas de los platillos nuevos (cantidad por porción, en la unidad del insumo).
INSERT INTO receta_detalle (producto_id, ingrediente_id, cantidad_requerida)
SELECT p.id, i.id, v.cantidad
FROM (VALUES
    ('GastroMind Demo - Sede Central', 'Papa a la huancaína',         'Papa amarilla',    0.250),
    ('GastroMind Demo - Sede Central', 'Papa a la huancaína',         'Queso fresco',     0.060),
    ('GastroMind Demo - Sede Central', 'Papa a la huancaína',         'Leche evaporada',  0.050),
    ('GastroMind Demo - Sede Central', 'Papa a la huancaína',         'Ají amarillo',     0.020),
    ('GastroMind Demo - Sede Central', 'Papa a la huancaína',         'Huevo',            1.000),
    ('GastroMind Demo - Sede Central', 'Causa limeña de pollo',       'Papa amarilla',    0.200),
    ('GastroMind Demo - Sede Central', 'Causa limeña de pollo',       'Pollo',            0.080),
    ('GastroMind Demo - Sede Central', 'Causa limeña de pollo',       'Limón',            0.020),
    ('GastroMind Demo - Sede Central', 'Causa limeña de pollo',       'Ají amarillo',     0.015),
    ('GastroMind Demo - Sede Central', 'Causa limeña de pollo',       'Aceite vegetal',   0.010),
    ('GastroMind Demo - Sede Central', 'Ceviche clásico',             'Pescado',          0.220),
    ('GastroMind Demo - Sede Central', 'Ceviche clásico',             'Limón',            0.150),
    ('GastroMind Demo - Sede Central', 'Ceviche clásico',             'Cebolla roja',     0.080),
    ('GastroMind Demo - Sede Central', 'Ceviche clásico',             'Culantro',         0.005),
    ('GastroMind Demo - Sede Central', 'Ceviche clásico',             'Camote',           0.120),
    ('GastroMind Demo - Sede Central', 'Ceviche clásico',             'Choclo',           0.500),
    ('GastroMind Demo - Sede Central', 'Tallarines verdes con pollo', 'Fideos',           0.180),
    ('GastroMind Demo - Sede Central', 'Tallarines verdes con pollo', 'Espinaca',         0.080),
    ('GastroMind Demo - Sede Central', 'Tallarines verdes con pollo', 'Queso fresco',     0.040),
    ('GastroMind Demo - Sede Central', 'Tallarines verdes con pollo', 'Leche evaporada',  0.050),
    ('GastroMind Demo - Sede Central', 'Tallarines verdes con pollo', 'Pollo',            0.200),
    ('GastroMind Demo - Sede Central', 'Pollo a la plancha',          'Pollo',            0.250),
    ('GastroMind Demo - Sede Central', 'Pollo a la plancha',          'Papa amarilla',    0.200),
    ('GastroMind Demo - Sede Central', 'Pollo a la plancha',          'Tomate',           0.050),
    ('GastroMind Demo - Sede Central', 'Pollo a la plancha',          'Aceite vegetal',   0.020),
    ('GastroMind Demo - Sede Central', 'Chaufa de pollo',             'Arroz',            0.200),
    ('GastroMind Demo - Sede Central', 'Chaufa de pollo',             'Pollo',            0.150),
    ('GastroMind Demo - Sede Central', 'Chaufa de pollo',             'Huevo',            1.000),
    ('GastroMind Demo - Sede Central', 'Chaufa de pollo',             'Cebolla roja',     0.030),
    ('GastroMind Demo - Sede Central', 'Chaufa de pollo',             'Aceite vegetal',   0.020),
    ('GastroMind Demo - Sede Central', 'Limonada (jarra)',            'Limón',            0.200),
    ('GastroMind Demo - Sede Central', 'Limonada (jarra)',            'Azúcar',           0.100),
    ('GastroMind Demo - Sede Central', 'Mazamorra morada',            'Maíz morado',      0.080),
    ('GastroMind Demo - Sede Central', 'Mazamorra morada',            'Azúcar',           0.050),
    ('GastroMind Demo - Sede Central', 'Mazamorra morada',            'Canela',           0.002),
    ('GastroMind Demo - Sede Central', 'Arroz con leche',             'Arroz',            0.050),
    ('GastroMind Demo - Sede Central', 'Arroz con leche',             'Leche evaporada',  0.100),
    ('GastroMind Demo - Sede Central', 'Arroz con leche',             'Azúcar',           0.040),
    ('GastroMind Demo - Sede Central', 'Arroz con leche',             'Canela',           0.002),
    ('GastroMind Demo - Sede Central', 'Suspiro limeño',              'Leche condensada', 0.120),
    ('GastroMind Demo - Sede Central', 'Suspiro limeño',              'Leche evaporada',  0.080),
    ('GastroMind Demo - Sede Central', 'Suspiro limeño',              'Huevo',            2.000),
    ('GastroMind Demo - Sede Central', 'Suspiro limeño',              'Azúcar',           0.030),
    ('GastroMind Demo - Sede Norte',   'Leche de tigre',              'Pescado',          0.100),
    ('GastroMind Demo - Sede Norte',   'Leche de tigre',              'Limón',            0.100),
    ('GastroMind Demo - Sede Norte',   'Leche de tigre',              'Cebolla roja',     0.040),
    ('GastroMind Demo - Sede Norte',   'Leche de tigre',              'Ají limo',         0.005),
    ('GastroMind Demo - Sede Norte',   'Sudado de pescado',           'Pescado',          0.250),
    ('GastroMind Demo - Sede Norte',   'Sudado de pescado',           'Tomate',           0.100),
    ('GastroMind Demo - Sede Norte',   'Sudado de pescado',           'Cebolla roja',     0.080),
    ('GastroMind Demo - Sede Norte',   'Sudado de pescado',           'Ají limo',         0.005),
    ('GastroMind Demo - Sede Norte',   'Sudado de pescado',           'Arroz',            0.150),
    ('GastroMind Demo - Sede Norte',   'Chicharrón de pescado',       'Pescado',          0.220),
    ('GastroMind Demo - Sede Norte',   'Chicharrón de pescado',       'Aceite vegetal',   0.050),
    ('GastroMind Demo - Sede Norte',   'Chicharrón de pescado',       'Yuca',             0.200),
    ('GastroMind Demo - Sede Norte',   'Chicharrón de pescado',       'Limón',            0.030)
) AS v(restaurante, producto, insumo, cantidad)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN categoria c ON c.restaurante_id = r.id
JOIN producto p ON p.categoria_id = c.id AND p.nombre = v.producto
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE NOT EXISTS (SELECT 1 FROM receta_detalle d WHERE d.producto_id = p.id AND d.ingrediente_id = i.id);

-- Más personal: varios mozos y cocineros por sede, como en un turno real. Misma clave y PIN que arriba.
INSERT INTO empleado (restaurante_id, rol_id, nombre_completo, correo, password_hash, pin_acceso, estado, fecha_registro)
SELECT r.id, (SELECT id FROM rol WHERE nombre = v.rol), v.nombre, v.correo,
       '$2a$10$cahPqSeDX3.MH6ROtNPAc.rFurkPmsdPwS1wnxF94RZIrb/F5inba',
       '$2a$10$JDTxOinYerLvb2WZoyCG.Orj0XS6DCd4/xYwUoih993A8xQpnSR46', v.estado, NOW() - v.hace
FROM (VALUES
    (1,  'GastroMind Demo - Sede Central', 'MOZO',       'Lucía Ramos Flores',     'lucia.ramos@gastromind.demo',     'ACTIVO',   INTERVAL '70 days'),
    (2,  'GastroMind Demo - Sede Central', 'MOZO',       'Carlos Huamán Rojas',    'carlos.huaman@gastromind.demo',   'ACTIVO',   INTERVAL '64 days'),
    (3,  'GastroMind Demo - Sede Central', 'MOZO',       'Rosa Quispe Mamani',     'rosa.quispe@gastromind.demo',     'ACTIVO',   INTERVAL '40 days'),
    (4,  'GastroMind Demo - Sede Central', 'COCINERO',   'Jorge Mendoza Silva',    'jorge.mendoza@gastromind.demo',   'ACTIVO',   INTERVAL '75 days'),
    (5,  'GastroMind Demo - Sede Central', 'COCINERO',   'Ana Torres Castillo',    'ana.torres@gastromind.demo',      'ACTIVO',   INTERVAL '52 days'),
    (6,  'GastroMind Demo - Sede Central', 'ALMACENERO', 'Miguel Salazar Ríos',    'miguel.salazar@gastromind.demo',  'ACTIVO',   INTERVAL '60 days'),
    (7,  'GastroMind Demo - Sede Central', 'MOZO',       'Diana Chávez Paredes',   'diana.chavez@gastromind.demo',    'INACTIVO', INTERVAL '90 days'),
    (8,  'GastroMind Demo - Sede Norte',   'MOZO',       'Patricia Vega Luna',     'patricia.vega@gastromind.demo',   'ACTIVO',   INTERVAL '45 days'),
    (9,  'GastroMind Demo - Sede Norte',   'ALMACENERO', 'Luis Paredes Navarro',   'luis.paredes@gastromind.demo',    'ACTIVO',   INTERVAL '45 days'),
    (10, 'GastroMind Demo - Sede Norte',   'COCINERO',   'Sofía Herrera Campos',   'sofia.herrera@gastromind.demo',   'ACTIVO',   INTERVAL '30 days')
) AS v(orden, restaurante, rol, nombre, correo, estado, hace)
JOIN restaurante r ON r.nombre = v.restaurante
WHERE NOT EXISTS (SELECT 1 FROM empleado e WHERE e.correo = v.correo)
ORDER BY v.orden;

-- Proveedores nuevos y sus precios (datos inventados, dominio .demo).
INSERT INTO proveedor (restaurante_id, nombre, contacto)
SELECT r.id, v.nombre, v.contacto
FROM (VALUES
    (1, 'GastroMind Demo - Sede Central', 'Terminal Pesquero - Puesto 8', 'Sr. Chumpitaz · 944 210 330'),
    (2, 'GastroMind Demo - Sede Central', 'Lácteos La Campiña',           'pedidos@lacampina.demo'),
    (3, 'GastroMind Demo - Sede Central', 'Abarrotes Don Lucho',          'ventas@donlucho.demo · 01 555 0102'),
    (4, 'GastroMind Demo - Sede Norte',   'Mercado Modelo - Puesto 3',    'Sra. Pérez · 966 400 812')
) AS v(orden, restaurante, nombre, contacto)
JOIN restaurante r ON r.nombre = v.restaurante
WHERE NOT EXISTS (SELECT 1 FROM proveedor p WHERE p.restaurante_id = r.id AND p.nombre = v.nombre)
ORDER BY v.orden;

INSERT INTO proveedor_insumo (proveedor_id, ingrediente_id, precio_unitario, tiempo_entrega_dias, flete)
SELECT p.id, i.id, v.precio, v.dias, v.flete
FROM (VALUES
    ('GastroMind Demo - Sede Central', 'Terminal Pesquero - Puesto 8',  'Pescado',          17.80, 0, 0.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Limón',             4.00, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Camote',            2.40, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Choclo',            1.40, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Culantro',          7.50, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Mercado Mayorista - Puesto 14', 'Espinaca',          5.80, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Lácteos La Campiña',            'Queso fresco',     21.50, 2, 6.00),
    ('GastroMind Demo - Sede Central', 'Lácteos La Campiña',            'Leche evaporada',   6.30, 2, 6.00),
    ('GastroMind Demo - Sede Central', 'Lácteos La Campiña',            'Leche condensada', 11.80, 2, 6.00),
    ('GastroMind Demo - Sede Central', 'Abarrotes Don Lucho',           'Huevo',             0.48, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Abarrotes Don Lucho',           'Fideos',            5.30, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Abarrotes Don Lucho',           'Azúcar',            3.90, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Abarrotes Don Lucho',           'Maíz morado',       6.80, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Abarrotes Don Lucho',           'Canela',           29.00, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Abarrotes Don Lucho',           'Arroz',             3.85, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Abarrotes Don Lucho',           'Aceite vegetal',    9.60, 1, 0.00),
    ('GastroMind Demo - Sede Central', 'Abarrotes Don Lucho',           'Lavavajilla',       8.50, 1, 0.00),
    ('GastroMind Demo - Sede Norte',   'Mercado Modelo - Puesto 3',     'Tomate',            4.40, 1, 0.00),
    ('GastroMind Demo - Sede Norte',   'Mercado Modelo - Puesto 3',     'Yuca',              2.60, 1, 0.00),
    ('GastroMind Demo - Sede Norte',   'Mercado Modelo - Puesto 3',     'Arroz',             3.75, 1, 0.00),
    ('GastroMind Demo - Sede Norte',   'Mercado Modelo - Puesto 3',     'Aceite vegetal',    9.80, 1, 0.00),
    ('GastroMind Demo - Sede Norte',   'Mercado Modelo - Puesto 3',     'Cebolla roja',      3.10, 1, 0.00)
) AS v(restaurante, proveedor, insumo, precio, dias, flete)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN proveedor p ON p.restaurante_id = r.id AND p.nombre = v.proveedor
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE NOT EXISTS (SELECT 1 FROM proveedor_insumo x WHERE x.proveedor_id = p.id AND x.ingrediente_id = i.id);

-- Historia de 8 semanas (14/11, recorrido de la demo): pedidos ya cerrados de la Sede Central, de 1 a 56 días
-- atrás, para que el panel tenga periodo anterior, la sugerencia de compra (HU-21) tenga consumo que promediar y
-- el teórico contra real (HU-20) compare volúmenes reales. Son fijos (no aleatorios), así la demo sale igual
-- cada vez: 3 pedidos al día y uno más el viernes y el sábado, en las mesas 2, 4 a 8 (la 1 y la 3 son de arriba).
-- El kardex de abajo los convierte en CONSUMO como a cualquier platillo servido.
WITH central AS (
    -- Seed: los pedidos se reparten entre los mozos activos de la sede
    SELECT r.id AS restaurante_id,
           (SELECT array_agg(e.id ORDER BY e.id) FROM empleado e JOIN rol ro ON ro.id = e.rol_id
            WHERE e.restaurante_id = r.id AND ro.nombre = 'MOZO' AND e.estado = 'ACTIVO') AS mozos
    FROM restaurante r
    WHERE r.nombre = 'GastroMind Demo - Sede Central'
), turnos AS (
    SELECT d, t, (date_trunc('day', NOW()) - d * INTERVAL '1 day' + h * INTERVAL '1 hour') AS fecha
    FROM generate_series(1, 56) AS d
    CROSS JOIN (VALUES (1, 13), (2, 14), (3, 20), (4, 21)) AS turno(t, h)
    WHERE t < 4 OR EXTRACT(ISODOW FROM date_trunc('day', NOW()) - d * INTERVAL '1 day') IN (5, 6)
), nuevos AS (
    INSERT INTO pedido (mesa_id, empleado_id, estado, fecha_registro)
    SELECT m.id, c.mozos[1 + (tu.d + tu.t) % array_length(c.mozos, 1)], 'CERRADO', tu.fecha
    FROM turnos tu
    CROSS JOIN central c
    JOIN mesa m ON m.restaurante_id = c.restaurante_id
               AND m.numero = (ARRAY[2, 4, 5, 6, 7, 8])[1 + (tu.d + tu.t) % 6]
    WHERE NOT EXISTS (SELECT 1 FROM pedido p JOIN mesa x ON x.id = p.mesa_id
                      WHERE x.restaurante_id = c.restaurante_id AND p.fecha_registro < NOW() - INTERVAL '2 days')
    RETURNING id, fecha_registro
)
INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, estado)
SELECT n.id, pr.id, v.cantidad, 'SERVIDO'
FROM nuevos n
CROSS JOIN LATERAL (
    SELECT EXTRACT(DOY FROM n.fecha_registro)::INT + EXTRACT(HOUR FROM n.fecha_registro)::INT AS k
) s
CROSS JOIN LATERAL (VALUES
    ('Arroz con pollo',             1 + s.k % 2),
    ('Lomo saltado',                1 + (s.k / 2) % 2),
    ('Chicha morada (jarra)',       s.k % 3),
    -- Seed: el resto de la carta, en cantidades fijas que varían con el día y la hora
    ('Papa a la huancaína',         (s.k / 3) % 2),
    ('Causa limeña de pollo',       (s.k / 5) % 2),
    ('Ceviche clásico',             (s.k / 2 + 1) % 2),
    ('Tallarines verdes con pollo', (s.k / 7) % 2),
    ('Pollo a la plancha',          (s.k / 4) % 2),
    ('Chaufa de pollo',             (s.k / 6 + 1) % 2),
    ('Limonada (jarra)',            (s.k / 3 + 1) % 2),
    ('Inca Kola 500 ml',            s.k % 3 / 2 * 2),
    ('Agua mineral',                (s.k / 5 + 1) % 2),
    ('Mazamorra morada',            (s.k / 4 + 1) % 2),
    ('Arroz con leche',             (s.k / 9) % 2),
    ('Suspiro limeño',              (s.k / 8 + 1) % 2)
) AS v(producto, cantidad)
JOIN restaurante r ON r.nombre = 'GastroMind Demo - Sede Central'
JOIN categoria c ON c.restaurante_id = r.id
JOIN producto pr ON pr.categoria_id = c.id AND pr.nombre = v.producto
WHERE v.cantidad > 0;

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

-- ============================================================
-- Seed (27/11): historia de compras y mermas de 8 semanas y conteos físicos,
-- para que todos los reportes de los tres programas tengan datos reales sin cargar nada a mano:
--   * HU-14 / HU-15: el kardex muestra ingresos semanales, no solo un saldo inicial.
--   * HU-19: el % de merma por periodo, insumo y motivo compara semanas.
--   * HU-20 / HU-30: teórico contra real ya tiene un conteo físico (antes había que contarlo en el celular).
-- Las compras históricas no tienen vencimiento (ya se consumieron): así la alerta de vencimiento (HU-16)
-- sigue mostrando solo los lotes de arriba. El stock_actual no cambia: el kardex de abajo recalcula el
-- saldo inicial. Se puede correr de nuevo: cada INSERT revisa que el dato no exista.
-- ============================================================

-- HU-14: compras de las últimas 8 semanas en la Sede Central (una por semana y por insumo; el arroz cada 2).
INSERT INTO registro_ingreso_proveedor
    (empleado_id, proveedor_id, ingrediente_id, lote, fecha_vencimiento, cantidad_recibida, costo_total, fecha_registro)
SELECT e.id, p.id, i.id, 'H' || LPAD(s.semana::TEXT, 2, '0') || '-' || v.codigo, NULL,
       v.cantidad, ROUND(v.cantidad * v.precio, 2),
       date_trunc('day', NOW()) - make_interval(days => s.semana * 7 + v.dia) + TIME '08:30'
FROM (VALUES
    ('Avícola Santa Rosa',            'Pollo',         'AV', 14.000, 11.20, 0, 1),
    ('Mercado Mayorista - Puesto 14', 'Arroz',         'AR', 20.000,  3.70, 1, 2),
    ('Mercado Mayorista - Puesto 14', 'Tomate',        'TO',  3.000,  4.30, 1, 1),
    ('Carnes del Valle',              'Lomo de res',   'CV',  6.000, 37.50, 2, 1),
    ('Mercado Mayorista - Puesto 14', 'Papa amarilla', 'PA', 18.000,  2.60, 1, 1),
    ('Mercado Mayorista - Puesto 14', 'Cebolla roja',  'CE',  5.000,  3.00, 1, 1),
    ('Mercado Mayorista - Puesto 14', 'Ají amarillo',  'AJ',  1.000, 11.50, 3, 2)
) AS v(proveedor, insumo, codigo, cantidad, precio, dia, cada)
CROSS JOIN generate_series(1, 8) AS s(semana)
JOIN restaurante r ON r.nombre = 'GastroMind Demo - Sede Central'
JOIN empleado e ON e.correo = 'almacen.central@gastromind.demo'
JOIN proveedor p ON p.restaurante_id = r.id AND p.nombre = v.proveedor
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE s.semana % v.cada = 0
  AND NOT EXISTS (SELECT 1 FROM registro_ingreso_proveedor x
                  WHERE x.ingrediente_id = i.id AND x.lote = 'H' || LPAD(s.semana::TEXT, 2, '0') || '-' || v.codigo);

-- HU-17 / HU-19: mermas de las últimas 8 semanas en la Sede Central, con motivos variados.
INSERT INTO registro_merma (empleado_id, ingrediente_id, cantidad, motivo_id, fecha_registro)
SELECT e.id, i.id, v.cantidad, mm.id, date_trunc('day', NOW()) - make_interval(days => v.dias) + TIME '21:30'
FROM (VALUES
    ('almacen.central@gastromind.demo', 'Tomate',        0.400, 'VENCIDO',    52),
    ('cocina.central@gastromind.demo',  'Pollo',         0.250, 'QUEMADO',    47),
    ('cocina.central@gastromind.demo',  'Aceite vegetal',0.300, 'DERRAMADO',  41),
    ('almacen.central@gastromind.demo', 'Papa amarilla', 0.800, 'VENCIDO',    38),
    ('cocina.central@gastromind.demo',  'Lomo de res',   0.200, 'MAL_MANEJO', 33),
    ('cocina.central@gastromind.demo',  'Arroz',         0.500, 'QUEMADO',    27),
    ('almacen.central@gastromind.demo', 'Cebolla roja',  0.600, 'VENCIDO',    24),
    ('cocina.central@gastromind.demo',  'Pollo',         0.250, 'QUEMADO',    19),
    ('almacen.central@gastromind.demo', 'Tomate',        0.500, 'VENCIDO',    15),
    ('cocina.central@gastromind.demo',  'Aceite vegetal',0.200, 'DERRAMADO',  11),
    ('cocina.central@gastromind.demo',  'Lomo de res',   0.250, 'QUEMADO',     6),
    ('almacen.central@gastromind.demo', 'Papa amarilla', 0.600, 'VENCIDO',     3)
) AS v(correo, insumo, cantidad, motivo, dias)
JOIN restaurante r ON r.nombre = 'GastroMind Demo - Sede Central'
JOIN empleado e ON e.correo = v.correo
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
JOIN motivo_merma mm ON mm.nombre = v.motivo AND mm.es_global
WHERE NOT EXISTS (SELECT 1 FROM registro_merma x
                  WHERE x.ingrediente_id = i.id AND x.motivo_id = mm.id
                    AND x.fecha_registro::date = (date_trunc('day', NOW()) - make_interval(days => v.dias))::date);

-- HU-30: conteo físico de hoy en la Sede Central. El stock del sistema es el actual (el conteo no
-- mueve el stock); lo que falta se suma al consumo real en teórico contra real (HU-20).
INSERT INTO conteo_ciclico (empleado_id, ingrediente_id, cantidad_fisica_contada, stock_sistema, fecha_registro)
SELECT e.id, i.id, i.stock_actual - v.faltante, i.stock_actual, NOW() - INTERVAL '10 minutes'
FROM (VALUES
    ('Arroz',       1.000),   -- faltó 1 kg: se resalta en teórico contra real
    ('Tomate',      0.300),   -- faltaron 300 g
    ('Pollo',       0.000),   -- cuadra
    ('Lomo de res', 0.000)    -- cuadra
) AS v(insumo, faltante)
JOIN restaurante r ON r.nombre = 'GastroMind Demo - Sede Central'
JOIN empleado e ON e.correo = 'almacen.central@gastromind.demo'
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE NOT EXISTS (SELECT 1 FROM conteo_ciclico x WHERE x.ingrediente_id = i.id);

-- ============================================================
-- Seed (27/11), operación del día: pedidos abiertos en varias mesas para la app
-- (mozo y cocina), historia de la Sede Norte, compras con lote, mermas y conteos de los
-- insumos nuevos. Se puede correr de nuevo: cada INSERT revisa que el dato no exista.
-- ============================================================

-- Historia de la Sede Norte: 4 semanas, 2 pedidos al día, en las mesas 1, 3, 4 y 5.
WITH norte AS (
    SELECT r.id AS restaurante_id,
           (SELECT array_agg(e.id ORDER BY e.id) FROM empleado e JOIN rol ro ON ro.id = e.rol_id
            WHERE e.restaurante_id = r.id AND ro.nombre = 'MOZO' AND e.estado = 'ACTIVO') AS mozos
    FROM restaurante r WHERE r.nombre = 'GastroMind Demo - Sede Norte'
), turnos AS (
    SELECT d, t, (date_trunc('day', NOW()) - d * INTERVAL '1 day' + h * INTERVAL '1 hour') AS fecha
    FROM generate_series(2, 29) AS d
    CROSS JOIN (VALUES (1, 13), (2, 20)) AS turno(t, h)
), nuevos AS (
    INSERT INTO pedido (mesa_id, empleado_id, estado, fecha_registro)
    SELECT m.id, n.mozos[1 + (tu.d + tu.t) % array_length(n.mozos, 1)], 'CERRADO', tu.fecha
    FROM turnos tu
    CROSS JOIN norte n
    JOIN mesa m ON m.restaurante_id = n.restaurante_id AND m.numero = (ARRAY[1, 3, 4, 5])[1 + (tu.d + tu.t) % 4]
    WHERE NOT EXISTS (SELECT 1 FROM pedido p JOIN mesa x ON x.id = p.mesa_id
                      WHERE x.restaurante_id = n.restaurante_id AND p.fecha_registro < NOW() - INTERVAL '2 days')
    RETURNING id, fecha_registro
)
INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, estado)
SELECT n.id, pr.id, v.cantidad, 'SERVIDO'
FROM nuevos n
CROSS JOIN LATERAL (
    SELECT EXTRACT(DOY FROM n.fecha_registro)::INT + EXTRACT(HOUR FROM n.fecha_registro)::INT AS k
) s
CROSS JOIN LATERAL (VALUES
    ('Ceviche de pescado',    1 + s.k % 2),
    ('Leche de tigre',        (s.k / 2) % 2),
    ('Sudado de pescado',     (s.k / 3) % 2),
    ('Chicharrón de pescado', (s.k + 1) % 2),
    ('Limonada',              1 + (s.k / 2) % 2),
    ('Chicha morada (jarra)', s.k % 3 / 2)
) AS v(producto, cantidad)
JOIN restaurante r ON r.nombre = 'GastroMind Demo - Sede Norte'
JOIN categoria c ON c.restaurante_id = r.id
JOIN producto pr ON pr.categoria_id = c.id AND pr.nombre = v.producto
WHERE v.cantidad > 0;

-- Pedidos abiertos de hoy, para que la app tenga movimiento: en el salón del mozo, en "En cocina" y en
-- la cocina (nueva, normal y demorada). La mesa 3 de Central ya tiene el suyo (arriba). Quedan libres
-- las mesas 1, 4 y 8 de Central (la demo de Spring toma la primera libre) y 2, 3 y 5 de Norte.
INSERT INTO pedido (mesa_id, empleado_id, estado, fecha_registro)
SELECT m.id, e.id, v.estado, NOW() - v.hace
FROM (VALUES
    ('GastroMind Demo - Sede Central', 2, 'lucia.ramos@gastromind.demo',   'EN_PREPARACION', INTERVAL '34 minutes'),
    ('GastroMind Demo - Sede Central', 5, 'carlos.huaman@gastromind.demo', 'ABIERTO',        INTERVAL '4 minutes'),
    ('GastroMind Demo - Sede Central', 6, 'mozo.central@gastromind.demo',  'EN_PREPARACION', INTERVAL '26 minutes'),
    ('GastroMind Demo - Sede Central', 7, 'rosa.quispe@gastromind.demo',   'SERVIDO',        INTERVAL '55 minutes'),
    ('GastroMind Demo - Sede Norte',   1, 'mozo.norte@gastromind.demo',    'EN_PREPARACION', INTERVAL '12 minutes'),
    ('GastroMind Demo - Sede Norte',   4, 'patricia.vega@gastromind.demo', 'ABIERTO',        INTERVAL '3 minutes')
) AS v(restaurante, mesa, correo, estado, hace)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN mesa m ON m.restaurante_id = r.id AND m.numero = v.mesa
JOIN empleado e ON e.correo = v.correo
WHERE NOT EXISTS (SELECT 1 FROM pedido p WHERE p.mesa_id = m.id AND p.estado <> 'CERRADO');

INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, estado)
SELECT p.id, pr.id, v.cantidad, v.estado
FROM (VALUES
    ('GastroMind Demo - Sede Central', 2, 'Ceviche clásico',             2, 'LISTO'),
    ('GastroMind Demo - Sede Central', 2, 'Chaufa de pollo',             1, 'EN_PREPARACION'),
    ('GastroMind Demo - Sede Central', 2, 'Limonada (jarra)',            1, 'SERVIDO'),
    ('GastroMind Demo - Sede Central', 5, 'Pollo a la plancha',          1, 'PENDIENTE'),
    ('GastroMind Demo - Sede Central', 5, 'Causa limeña de pollo',       2, 'PENDIENTE'),
    ('GastroMind Demo - Sede Central', 5, 'Agua mineral',                2, 'PENDIENTE'),
    ('GastroMind Demo - Sede Central', 6, 'Tallarines verdes con pollo', 2, 'EN_PREPARACION'),
    ('GastroMind Demo - Sede Central', 6, 'Papa a la huancaína',         2, 'LISTO'),
    ('GastroMind Demo - Sede Central', 6, 'Mazamorra morada',            2, 'PENDIENTE'),
    ('GastroMind Demo - Sede Central', 6, 'Inca Kola 500 ml',            2, 'SERVIDO'),
    ('GastroMind Demo - Sede Central', 7, 'Lomo saltado',                2, 'SERVIDO'),
    ('GastroMind Demo - Sede Central', 7, 'Arroz con leche',             2, 'SERVIDO'),
    ('GastroMind Demo - Sede Central', 7, 'Chicha morada (jarra)',       1, 'SERVIDO'),
    ('GastroMind Demo - Sede Norte',   1, 'Ceviche de pescado',          1, 'EN_PREPARACION'),
    ('GastroMind Demo - Sede Norte',   1, 'Leche de tigre',              1, 'LISTO'),
    ('GastroMind Demo - Sede Norte',   1, 'Limonada',                    2, 'SERVIDO'),
    ('GastroMind Demo - Sede Norte',   4, 'Sudado de pescado',           2, 'PENDIENTE'),
    ('GastroMind Demo - Sede Norte',   4, 'Chicha morada (jarra)',       1, 'PENDIENTE')
) AS v(restaurante, mesa, producto, cantidad, estado)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN mesa m ON m.restaurante_id = r.id AND m.numero = v.mesa
JOIN pedido p ON p.mesa_id = m.id AND p.estado <> 'CERRADO'
JOIN categoria c ON c.restaurante_id = r.id
JOIN producto pr ON pr.categoria_id = c.id AND pr.nombre = v.producto
WHERE NOT EXISTS (SELECT 1 FROM pedido_detalle d WHERE d.pedido_id = p.id AND d.producto_id = pr.id);

-- Las mesas con un pedido abierto quedan OCUPADAS (como las deja PedidoService).
UPDATE mesa m SET estado = 'OCUPADA'
WHERE m.estado = 'LIBRE'
  AND EXISTS (SELECT 1 FROM pedido p WHERE p.mesa_id = m.id AND p.estado <> 'CERRADO');

-- HU-14 / HU-16: compras semanales de los insumos nuevos (8 semanas) y lotes vigentes con vencimiento:
-- el queso fresco vence en 3 días (alerta) y la leche evaporada en 40 (no alerta).
INSERT INTO registro_ingreso_proveedor
    (empleado_id, proveedor_id, ingrediente_id, lote, fecha_vencimiento, cantidad_recibida, costo_total, fecha_registro)
SELECT e.id, p.id, i.id, 'H' || LPAD(s.semana::TEXT, 2, '0') || '-' || v.codigo, NULL,
       v.cantidad, ROUND(v.cantidad * v.precio, 2),
       date_trunc('day', NOW()) - make_interval(days => s.semana * 7 + v.dia) + TIME '09:00'
FROM (VALUES
    ('Terminal Pesquero - Puesto 8',  'Pescado',         'PE',  3.000, 17.80, 0, 'almacen.central@gastromind.demo'),
    ('Mercado Mayorista - Puesto 14', 'Limón',           'LI',  4.000,  4.00, 1, 'miguel.salazar@gastromind.demo'),
    ('Lácteos La Campiña',            'Queso fresco',    'QF',  1.000, 21.50, 2, 'almacen.central@gastromind.demo'),
    ('Lácteos La Campiña',            'Leche evaporada', 'LE',  2.000,  6.30, 2, 'miguel.salazar@gastromind.demo'),
    ('Abarrotes Don Lucho',           'Huevo',           'HU', 50.000,  0.48, 3, 'almacen.central@gastromind.demo'),
    ('Mercado Mayorista - Puesto 14', 'Choclo',          'CH',  7.000,  1.40, 1, 'miguel.salazar@gastromind.demo'),
    ('Abarrotes Don Lucho',           'Azúcar',          'AZ',  3.000,  3.90, 3, 'almacen.central@gastromind.demo'),
    ('Abarrotes Don Lucho',           'Aceite vegetal',  'AC',  2.500,  9.60, 3, 'almacen.central@gastromind.demo'),
    ('Mercado Mayorista - Puesto 14', 'Camote',          'CA',  2.000,  2.40, 1, 'miguel.salazar@gastromind.demo'),
    ('Abarrotes Don Lucho',           'Fideos',          'FI',  2.000,  5.30, 3, 'miguel.salazar@gastromind.demo')
) AS v(proveedor, insumo, codigo, cantidad, precio, dia, correo)
CROSS JOIN generate_series(1, 8) AS s(semana)
JOIN restaurante r ON r.nombre = 'GastroMind Demo - Sede Central'
JOIN empleado e ON e.correo = v.correo
JOIN proveedor p ON p.restaurante_id = r.id AND p.nombre = v.proveedor
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE NOT EXISTS (SELECT 1 FROM registro_ingreso_proveedor x
                  WHERE x.ingrediente_id = i.id AND x.lote = 'H' || LPAD(s.semana::TEXT, 2, '0') || '-' || v.codigo);

-- Compras semanales de la Sede Norte (4 semanas, las mismas de su historia de pedidos).
INSERT INTO registro_ingreso_proveedor
    (empleado_id, proveedor_id, ingrediente_id, lote, fecha_vencimiento, cantidad_recibida, costo_total, fecha_registro)
SELECT e.id, p.id, i.id, 'N' || LPAD(s.semana::TEXT, 2, '0') || '-' || v.codigo, NULL,
       v.cantidad, ROUND(v.cantidad * v.precio, 2),
       date_trunc('day', NOW()) - make_interval(days => s.semana * 7 + v.dia) + TIME '08:00'
FROM (VALUES
    ('Pescados del Litoral',        'Pescado', 'PE', 4.000, 17.50, 0),
    ('Frutas y Cítricos del Norte', 'Limón',   'LI', 4.000,  4.00, 1),
    ('Frutas y Cítricos del Norte', 'Camote',  'CA', 4.000,  2.40, 1),
    ('Mercado Modelo - Puesto 3',   'Arroz',   'AR', 4.000,  3.75, 2),
    ('Mercado Modelo - Puesto 3',   'Yuca',    'YU', 2.000,  2.60, 2)
) AS v(proveedor, insumo, codigo, cantidad, precio, dia)
CROSS JOIN generate_series(1, 4) AS s(semana)
JOIN restaurante r ON r.nombre = 'GastroMind Demo - Sede Norte'
JOIN empleado e ON e.correo = 'luis.paredes@gastromind.demo'
JOIN proveedor p ON p.restaurante_id = r.id AND p.nombre = v.proveedor
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE NOT EXISTS (SELECT 1 FROM registro_ingreso_proveedor x
                  WHERE x.ingrediente_id = i.id AND x.lote = 'N' || LPAD(s.semana::TEXT, 2, '0') || '-' || v.codigo);

INSERT INTO registro_ingreso_proveedor
    (empleado_id, proveedor_id, ingrediente_id, lote, fecha_vencimiento, cantidad_recibida, costo_total, fecha_registro)
SELECT e.id, p.id, i.id, v.lote, CURRENT_DATE + v.vence_en_dias, v.cantidad, v.costo, NOW() - v.hace
FROM (VALUES
    ('GastroMind Demo - Sede Central', 'miguel.salazar@gastromind.demo', 'Lácteos La Campiña',        'Queso fresco',    'LC-2711', 3,  1.500, 32.25, INTERVAL '1 day'),
    ('GastroMind Demo - Sede Central', 'miguel.salazar@gastromind.demo', 'Lácteos La Campiña',        'Leche evaporada', 'LC-2711-L', 40, 4.000, 25.20, INTERVAL '1 day'),
    ('GastroMind Demo - Sede Norte',   'luis.paredes@gastromind.demo',   'Mercado Modelo - Puesto 3', 'Tomate',          'MO-2611', 5,  3.000, 13.20, INTERVAL '2 days')
) AS v(restaurante, correo, proveedor, insumo, lote, vence_en_dias, cantidad, costo, hace)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN empleado e ON e.correo = v.correo
JOIN proveedor p ON p.restaurante_id = r.id AND p.nombre = v.proveedor
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE NOT EXISTS (SELECT 1 FROM registro_ingreso_proveedor x WHERE x.ingrediente_id = i.id AND x.lote = v.lote);

-- HU-17 / HU-19: mermas de los insumos nuevos y de la Sede Norte.
INSERT INTO registro_merma (empleado_id, ingrediente_id, cantidad, motivo_id, fecha_registro)
SELECT e.id, i.id, v.cantidad, mm.id, date_trunc('day', NOW()) - make_interval(days => v.dias) + TIME '22:00'
FROM (VALUES
    ('GastroMind Demo - Sede Central', 'jorge.mendoza@gastromind.demo',  'Pescado',         0.300, 'MAL_MANEJO', 44),
    ('GastroMind Demo - Sede Central', 'miguel.salazar@gastromind.demo', 'Queso fresco',    0.200, 'VENCIDO',    36),
    ('GastroMind Demo - Sede Central', 'ana.torres@gastromind.demo',     'Huevo',           4.000, 'DERRAMADO',  29),
    ('GastroMind Demo - Sede Central', 'miguel.salazar@gastromind.demo', 'Espinaca',        0.300, 'VENCIDO',    22),
    ('GastroMind Demo - Sede Central', 'jorge.mendoza@gastromind.demo',  'Leche evaporada', 0.400, 'DERRAMADO',  13),
    ('GastroMind Demo - Sede Central', 'ana.torres@gastromind.demo',     'Pescado',         0.250, 'QUEMADO',     8),
    ('GastroMind Demo - Sede Central', 'miguel.salazar@gastromind.demo', 'Limón',           0.500, 'VENCIDO',     2),
    ('GastroMind Demo - Sede Norte',   'sofia.herrera@gastromind.demo',  'Pescado',         0.300, 'MAL_MANEJO', 18),
    ('GastroMind Demo - Sede Norte',   'luis.paredes@gastromind.demo',   'Camote',          0.500, 'VENCIDO',     9),
    ('GastroMind Demo - Sede Norte',   'sofia.herrera@gastromind.demo',  'Aceite vegetal',  0.150, 'DERRAMADO',   4)
) AS v(restaurante, correo, insumo, cantidad, motivo, dias)
JOIN restaurante r ON r.nombre = v.restaurante
JOIN empleado e ON e.correo = v.correo
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
JOIN motivo_merma mm ON mm.nombre = v.motivo AND mm.es_global
WHERE NOT EXISTS (SELECT 1 FROM registro_merma x
                  WHERE x.ingrediente_id = i.id AND x.motivo_id = mm.id
                    AND x.fecha_registro::date = (date_trunc('day', NOW()) - make_interval(days => v.dias))::date);

-- HU-30: más conteos físicos de hoy (el pescado y el queso cuadran; al limón le falta medio kilo).
INSERT INTO conteo_ciclico (empleado_id, ingrediente_id, cantidad_fisica_contada, stock_sistema, fecha_registro)
SELECT e.id, i.id, i.stock_actual - v.faltante, i.stock_actual, NOW() - INTERVAL '25 minutes'
FROM (VALUES
    ('Pescado',      0.000),
    ('Queso fresco', 0.000),
    ('Limón',        0.500)
) AS v(insumo, faltante)
JOIN restaurante r ON r.nombre = 'GastroMind Demo - Sede Central'
JOIN empleado e ON e.correo = 'miguel.salazar@gastromind.demo'
JOIN ingrediente i ON i.restaurante_id = r.id AND i.nombre = v.insumo
WHERE NOT EXISTS (SELECT 1 FROM conteo_ciclico x WHERE x.ingrediente_id = i.id);

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
