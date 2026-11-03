package com.gastromind.backendspring.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Platillo de la carta (tabla producto de script_database.sql). Lo gestiona Django (HU-07);
 * Spring solo lo lee para tomar un pedido.
 */
@Entity
@Table(name = "producto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Producto {

    public static final String ACTIVO = "ACTIVO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "precio", nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    @Builder.Default
    @Column(name = "requiere_receta", nullable = false)
    private Boolean requiereReceta = true;

    @Builder.Default
    @Column(name = "estado", nullable = false, length = 20)
    private String estado = ACTIVO;
}
