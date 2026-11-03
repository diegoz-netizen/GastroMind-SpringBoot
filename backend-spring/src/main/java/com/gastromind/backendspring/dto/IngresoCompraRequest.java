package com.gastromind.backendspring.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * HU-14 (CA-21): lo que llega al almacén. El restaurante y quién lo registra salen del token.
 * Lote y vencimiento son opcionales (insumos no perecibles).
 */
public record IngresoCompraRequest(
        @NotNull(message = "El proveedor es obligatorio")
        Long proveedorId,

        @NotNull(message = "El insumo es obligatorio")
        Long ingredienteId,

        @NotNull(message = "La cantidad es obligatoria")
        @DecimalMin(value = "0", inclusive = false, message = "La cantidad debe ser mayor que 0")
        @Digits(integer = 7, fraction = 3, message = "La cantidad admite hasta 3 decimales")
        BigDecimal cantidad,

        @NotNull(message = "El costo total es obligatorio")
        @DecimalMin(value = "0", message = "El costo total no puede ser negativo")
        @Digits(integer = 8, fraction = 2, message = "El costo total admite hasta 2 decimales")
        BigDecimal costoTotal,

        @Size(max = 50, message = "El lote admite hasta 50 caracteres")
        String lote,

        LocalDate fechaVencimiento
) {}
