# Cronograma (Gantt)

Volver al [README](../README.md) · Modelo de datos: [`modelo_datos.md`](modelo_datos.md)

4 sprints de 2 semanas (lunes a domingo). Integración el sábado y Review el domingo de cierre. Lo gris ya está en `main`; las fechas de cierre de lo hecho son las del merge.

```mermaid
gantt
  title GastroMind: cronograma de los 4 sprints (2026)
  dateFormat YYYY-MM-DD
  axisFormat %d/%m
  todayMarker off

  section Sprint 1 · Acceso
  HU-01 Registrar empleados (Piero)         :done, s1a, 2026-09-28, 14d
  HU-02 Login (Diego)                       :done, s1b, 2026-09-28, 14d
  HU-03 Activar/desactivar (Victor)         :done, s1c, 2026-09-28, 14d
  Review 1                                  :milestone, done, r1, 2026-10-11, 0d

  section Sprint 2 · Insumos y recetas
  HU-04 Recuperar contraseña (Victor)       :done, s2a, 2026-10-12, 2026-10-17
  HU-05 Insumos (Diego)                     :done, s2b, 2026-10-12, 2026-10-15
  HU-07 Carta (Victor)                      :done, s2d, 2026-10-12, 2026-10-22
  HU-08 Costo del platillo (Diego)          :done, s2f, 2026-10-21, 2026-10-23
  HU-01 Formulario React (Piero)            :done, s2e, 2026-10-12, 2026-10-25
  HU-06 Receta BOM (Piero, pantalla Victor) :done, s2c, 2026-10-12, 2026-10-28
  Integración                               :done, i2, 2026-10-24, 1d
  Review 2                                  :milestone, done, r2, 2026-10-25, 0d

  section Sprint 3 · Pedidos e inventario
  Bases de pedidos (Piero), Kotlin (Diego) y movimientos (Victor)  :crit, s3z, 2026-10-26, 2026-10-30
  HU-01-b Bienvenida sin clave / ajustes HU-08 / HU-27 PIN (Diego)  :s3d, 2026-10-26, 2026-11-06
  HU-09 Tomar pedido / HU-12 Cerrar mesa / HU-13 Descuento (Piero)  :s3a, 2026-10-30, 2026-11-06
  HU-10 KDS / HU-11 Estado del platillo (Diego)                     :s3b, 2026-10-30, 2026-11-06
  HU-14 Ingreso de compras (Victor)                                 :s3c, 2026-10-30, 2026-11-06
  HU-15 Kardex / HU-16 Alertas (Victor, si las bases están el 29/10) :s3e, 2026-10-30, 2026-11-06
  HU-26 Mesas del salón (por asignar)                               :s3f, 2026-10-30, 2026-11-06
  Mitad de sprint                           :milestone, m3, 2026-10-31, 0d
  Último PR                                 :milestone, u3, 2026-11-05, 0d
  Integración                               :crit, i3, 2026-11-07, 1d
  Review 3                                  :milestone, r3, 2026-11-08, 0d

  section Sprint 4 · Mermas y reportes
  HU-20 Teórico vs real / HU-21 IA / HU-24 Exportar (Piero)        :s4a, 2026-11-09, 2026-11-22
  HU-18 Anulado→merma / HU-23 Dashboard / HU-25 RECETA-LIBRE (Diego) :s4b, 2026-11-09, 2026-11-22
  HU-17 Merma / HU-19 % merma / HU-22 Proveedores (Victor)         :s4c, 2026-11-09, 2026-11-22
  Integración                               :crit, i4, 2026-11-21, 1d
  Entrega final                             :milestone, r4, 2026-11-22, 0d
```

| Sprint | Fechas | Épicas |
|---|---|---|
| 1 | 28/09 – 11/10 | EP-01 Acceso y Seguridad |
| 2 | 12/10 – 25/10 | EP-02 Insumos y Recetas (+ HU-04 y el formulario de HU-01). La HU-06 se aceptó el 27/10 y la HU-01-b pasó al Sprint 3 |
| 3 | 26/10 – 08/11 | EP-03 Pedidos y Comanda + EP-04 Inventario |
| 4 (final) | 09/11 – 22/11 | EP-05 Mermas + EP-06 Compras y Reportes (+ HU-25) |

El Sprint 3 sigue la propuesta de la Planning 3 (28/10): bases el jue 29/10, mitad de sprint el sáb 31/10, último PR el jue 5/11, integración el sáb 7/11 y Review el dom 8/11. HU-15 y HU-16 van en Django y entran solo si las bases están el 29/10; si no, pasan al Sprint 4. El reparto del Sprint 4 se confirma en su Planning.
