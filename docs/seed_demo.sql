-- ============================================================
-- GASTROMIND — Datos semilla de DEMO (HU-02 Login, HU-05 Insumos, HU-06 Carta y recetas)
-- Ejecutar DESPUES de script_database.sql (los roles ya existen ahi,
-- por eso NO se reinsertan; se referencian por nombre).
--
-- Credenciales demo (solo entorno local/demo):
--   admin.central@gastromind.demo  /  Demo2026!
--   admin.norte@gastromind.demo    /  Demo2026!
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

COMMIT;
