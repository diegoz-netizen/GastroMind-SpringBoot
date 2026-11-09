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
  Base de movimientos de inventario (Victor)              :done, s3a, 2026-10-26, 2026-10-31
  HU-27 PIN, ajustes HU-05 y HU-08 (Diego)                  :done, s3b, 2026-10-26, 2026-10-29
  HU-01-b Bienvenida sin clave (Diego)                      :done, s3c, 2026-10-29, 2026-11-01
  Base de pedidos y HU-13 Descuento al servir (Victor)      :done, s3d, 2026-10-30, 2026-11-03
  HU-14 Compras y HU-15 Kardex (Victor)                     :done, s3e, 2026-10-30, 2026-11-03
  HU-10 KDS y HU-11 Estado del platillo (Diego)             :done, s3f, 2026-10-30, 2026-11-03
  HU-16 Alertas, web y backend (Victor)                     :done, s3g, 2026-10-30, 2026-11-03
  HU-09 Tomar pedido, HU-12 Cerrar mesa y correo HU-16 (Victor) :done, s3h, 2026-11-03, 2026-11-07
  Integración                               :done, crit, i3, 2026-11-07, 1d
  Review 3                                  :milestone, r3, 2026-11-08, 0d

  section Sprint 4 · Hecho (adelantado al 7 y 8/11)
  Base de reportes, HU-20 Teórico vs. real, HU-30 Conteo, HU-23 Panel, HU-25 (Diego) :done, s4a, 2026-11-03, 2026-11-07
  HU-21 Sugerencia de compra (Diego)                         :done, s4b, 2026-11-05, 2026-11-08
  HU-18 Platillo anulado → merma (Diego)                     :done, s4c, 2026-11-05, 2026-11-07
  HU-17 Merma, HU-19 % de merma, HU-22 Proveedores (Victor)  :done, s4d, 2026-11-05, 2026-11-07
  HU-26 Mesas y HU-24 Exportar a Excel (Victor)              :done, s4e, 2026-11-07, 2026-11-08

  section Sprint 4 · Pendiente (propuesta de la Planning 4)
  Planning 4                                :milestone, p4, 2026-11-09, 0d
  Rediseño de la web con componentes (Diego)                 :s4f, 2026-11-09, 2026-11-15
  docker-compose y «Despliegue» en los 3 README (Diego)      :s4g, 2026-11-09, 2026-11-15
  APK en Releases y prueba en celular o tablet (Victor)      :s4h, 2026-11-09, 2026-11-15
  Diagramas e informe (Doc)                                  :s4i, 2026-11-16, 2026-11-17
  PPT en Canva y videos de los 3 perfiles                    :s4j, 2026-11-18, 2026-11-19
  Ensayos con cronómetro                                     :s4k, 2026-11-20, 2026-11-22
  Entrega final                             :milestone, r4, 2026-11-22, 0d
```

| Sprint | Fechas | Épicas |
|---|---|---|
| 1 | 28/09 – 11/10 | EP-01 Acceso y Seguridad |
| 2 | 12/10 – 25/10 | EP-02 Insumos y Recetas (+ HU-04 y el formulario de HU-01). La HU-06 se aceptó el 27/10 y la HU-01-b pasó al Sprint 3 |
| 3 | 26/10 – 08/11 | EP-03 Pedidos y Comanda + EP-04 Inventario |
| 4 (final) | 09/11 – 22/11 | EP-05 Mermas + EP-06 Compras y Reportes (+ HU-25) |

**Avance al lun 9/11.** Todo lo del Sprint 3 y lo adelantado del Sprint 4 (HU-17 a HU-26 y HU-30) está en `main`; las fechas son las del merge de cada PR. Lo pendiente del Sprint 4 sale de la propuesta del PO para la Planning 4: son fechas de trabajo, no de entrega, y la fecha final de entrega y sustentación **está por confirmar con el docente**. HU-15 y HU-16 de Django entraron en el Sprint 3. La aceptación del PO de las HU sigue pendiente (ver `Tareas.md`).
