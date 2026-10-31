package com.gastromind.backendspring.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * HU-05: insumo del almacén (tabla ingrediente de script_database.sql).
 * Multi-tenant: cada insumo pertenece a UN restaurante y el nombre no se repite dentro de él.
 * tipo_control y la dotación se mapean para mantener el esquema completo, pero su gestión
 * (RECETA / LIBRE) es de la HU-25 (Sprint 4).
 */
@Entity
@Table(name = "ingrediente",
        // Mismo nombre que PostgreSQL le da al UNIQUE del script: con ddl-auto=update no se duplica el índice
        uniqueConstraints = @UniqueConstraint(name = "ingrediente_restaurante_id_nombre_key",
                columnNames = {"restaurante_id", "nombre"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ingrediente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurante_id", nullable = false)
    private Restaurante restaurante;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "unidad_medida", nullable = false, length = 20)
    private String unidadMedida;

    @Builder.Default
    @Column(name = "stock_actual", nullable = false, precision = 10, scale = 3)
    private BigDecimal stockActual = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "stock_minimo", nullable = false, precision = 10, scale = 3)
    private BigDecimal stockMinimo = BigDecimal.ZERO;

    @Column(name = "costo_unitario", nullable = false, precision = 10, scale = 2)
    private BigDecimal costoUnitario;

    @Builder.Default
    @Column(name = "tipo_control", nullable = false, length = 20)
    private String tipoControl = "RECETA";

    @Column(name = "dotacion_cantidad", precision = 10, scale = 3)
    private BigDecimal dotacionCantidad;

    @Column(name = "dotacion_periodo", length = 20)
    private String dotacionPeriodo;
}
