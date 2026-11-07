package com.gastromind.backendspring.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * HU-30 (CA-30): lo que el almacenero contó de un insumo. El restaurante, quién cuenta y la fecha salen del token
 * y del servidor. Contar 0 es válido: el insumo se acabó.
 */
public record ConteoRequest(
        @NotNull(message = "El insumo es obligatorio")
        Long ingredienteId,

        @NotNull(message = "La cantidad contada es obligatoria")
        @DecimalMin(value = "0", message = "La cantidad contada no puede ser negativa")
        @Digits(integer = 7, fraction = 3, message = "La cantidad admite hasta 3 decimales")
        BigDecimal cantidad
) {}
