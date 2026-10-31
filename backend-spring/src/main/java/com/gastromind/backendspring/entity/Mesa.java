package com.gastromind.backendspring.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Mesa del salón (tabla mesa de script_database.sql). Multi-tenant: cada mesa es de UN restaurante.
 * Su gestión es de la HU-26; aquí se lee y se ocupa al tomar un pedido.
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
}
