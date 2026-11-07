package com.gastromind.backendspring.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * HU-17 (CA-17): la merma que se registra. El motivo es obligatorio; el restaurante y el responsable
 * salen del token.
 */
public record MermaRequest(
        @NotNull(message = "El insumo es obligatorio")
        Long ingredienteId,

        @NotNull(message = "La cantidad es obligatoria")
        @DecimalMin(value = "0", inclusive = false, message = "La cantidad debe ser mayor que 0")
        @Digits(integer = 7, fraction = 3, message = "La cantidad admite hasta 3 decimales")
        BigDecimal cantidad,

        @NotNull(message = "El motivo es obligatorio")
        Long motivoId
) {}
