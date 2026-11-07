package com.gastromind.backendspring.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * HU-30: un conteo físico de un insumo (tabla conteo_ciclico). Guarda lo contado y el stock que tenía el sistema
 * en ese momento (migración 009), así la diferencia queda registrada aunque el stock cambie después.
 * El conteo no toca el stock: la diferencia la usa el reporte teórico contra real (HU-20).
 */
@Entity
@Table(name = "conteo_ciclico")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConteoCiclico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Quién contó (Almacenero o Administrador)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empleado_id", nullable = false)
    private Empleado empleado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingrediente_id", nullable = false)
    private Ingrediente ingrediente;

    @Column(name = "cantidad_fisica_contada", nullable = false, precision = 10, scale = 3)
    private BigDecimal cantidadFisicaContada;

    @Column(name = "stock_sistema", precision = 10, scale = 3)
    private BigDecimal stockSistema;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @PrePersist
    protected void onCreate() {
        if (this.fechaRegistro == null) {
            this.fechaRegistro = LocalDateTime.now();
        }
    }

    /** Contado − sistema: negativo si falta mercadería, positivo si sobra. */
    public BigDecimal getDiferencia() {
        return stockSistema == null ? null : cantidadFisicaContada.subtract(stockSistema);
    }
}
