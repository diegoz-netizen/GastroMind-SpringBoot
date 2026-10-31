package com.gastromind.backendspring.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Categoría de la carta (tabla categoria de script_database.sql). La gestiona Django;
 * Spring solo la lee para saber de qué restaurante es un producto.
 */
@Entity
@Table(name = "categoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurante_id", nullable = false)
    private Restaurante restaurante;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;
}
