package com.gastromind.backendspring.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Insumo de la receta de un platillo (tabla receta_detalle de script_database.sql). La gestiona Django (HU-06);
 * Spring solo la lee para descontar el stock al servir (HU-13).
 */
@Entity
@Table(name = "receta_detalle")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecetaDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingrediente_id", nullable = false)
    private Ingrediente ingrediente;

    @Column(name = "cantidad_requerida", nullable = false, precision = 10, scale = 3)
    private BigDecimal cantidadRequerida;
}
