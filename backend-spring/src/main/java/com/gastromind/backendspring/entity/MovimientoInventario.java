package com.gastromind.backendspring.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Sprint 3 (migración 005): cada cambio de stock de un insumo, con la cantidad (+ entra, - sale)
 * y el saldo que quedó. Lo crea solo InventarioService, en la misma transacción que actualiza
 * ingrediente.stock_actual; Django lo lee para el kardex (HU-15).
 * Los orígenes (pedido_detalle, registro_ingreso_proveedor, registro_merma) van como id porque
 * esas tablas todavía no tienen entidad en Spring; la FK la pone el script.
 */
@Entity
@Table(name = "movimiento_inventario",
        // Mismos nombres que en script_database.sql: también rigen en los tests con H2
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_movimiento_consumo", columnNames = {"pedido_detalle_id", "ingrediente_id"}),
                @UniqueConstraint(name = "uq_movimiento_ingreso", columnNames = {"registro_ingreso_id"}),
                @UniqueConstraint(name = "uq_movimiento_merma", columnNames = {"registro_merma_id"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimientoInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingrediente_id", nullable = false)
    private Ingrediente ingrediente;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 20)
    private TipoMovimiento tipo;

    @Column(name = "cantidad", nullable = false, precision = 10, scale = 3)
    private BigDecimal cantidad;

    @Column(name = "saldo", nullable = false, precision = 10, scale = 3)
    private BigDecimal saldo;

    // NULL solo en el saldo inicial que carga una migración
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empleado_id")
    private Empleado empleado;

    @Column(name = "pedido_detalle_id")
    private Long pedidoDetalleId;

    @Column(name = "registro_ingreso_id")
    private Long registroIngresoId;

    @Column(name = "registro_merma_id")
    private Long registroMermaId;

    @Column(name = "fecha", nullable = false, updatable = false)
    private LocalDateTime fecha;

    @PrePersist
    protected void onCreate() {
        if (this.fecha == null) {
            this.fecha = LocalDateTime.now();
        }
    }
}
