package com.gastromind.backendspring.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * HU-17: motivo de una merma (tabla motivo_merma de script_database.sql).
 * Los globales (restaurante NULL, es_global TRUE) los trae el script; un restaurante puede tener los suyos.
 * Aquí solo se leen: no hay CRUD de motivos en el Sprint 4.
 */
@Entity
@Table(name = "motivo_merma")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MotivoMerma {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // NULL = motivo global, disponible para todos los restaurantes
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurante_id")
    private Restaurante restaurante;

    @Column(name = "nombre", nullable = false, length = 50)
    private String nombre;

    @Builder.Default
    @Column(name = "es_global", nullable = false)
    private Boolean esGlobal = false;
}
