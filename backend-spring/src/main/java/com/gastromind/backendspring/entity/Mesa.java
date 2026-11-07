package com.gastromind.backendspring.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Mesa del salón (tabla mesa de script_database.sql). Multi-tenant: cada mesa es de UN restaurante.
 * La registra y edita el administrador (HU-26) y la ocupa el mozo al tomar un pedido (HU-09).
 */
@Entity
@Table(name = "mesa")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mesa {

    public static final String LIBRE = "LIBRE";
    public static final String OCUPADA = "OCUPADA";
    public static final int CAPACIDAD_POR_DEFECTO = 4;
    public static final String ZONA_POR_DEFECTO = "Salón";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurante_id", nullable = false)
    private Restaurante restaurante;

    @Column(name = "numero", nullable = false)
    private Integer numero;

    @Builder.Default
    @Column(name = "estado", nullable = false, length = 20)
    private String estado = LIBRE;

    // HU-26: cuántas personas entran (1 a 30) y en qué zona está
    @Builder.Default
    @Column(name = "capacidad", nullable = false)
    private Integer capacidad = CAPACIDAD_POR_DEFECTO;

    @Builder.Default
    @Column(name = "zona", nullable = false, length = 30)
    private String zona = ZONA_POR_DEFECTO;
}
