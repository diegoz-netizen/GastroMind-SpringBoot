package com.gastromind.backendspring.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * HU-14: proveedor al que el restaurante le compra (tabla proveedor de script_database.sql).
 * Multi-tenant: cada proveedor es de UN restaurante. Su CRUD y los precios por insumo son de la HU-22 (Sprint 4);
 * aquí solo se lee para registrar el ingreso de una compra.
 */
@Entity
@Table(name = "proveedor")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Proveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurante_id", nullable = false)
    private Restaurante restaurante;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "contacto", length = 150)
    private String contacto;
}
