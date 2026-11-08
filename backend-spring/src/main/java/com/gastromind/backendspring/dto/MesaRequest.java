package com.gastromind.backendspring.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * HU-26: datos de una mesa al crearla o editarla. El estado no se manda: lo cambian los pedidos.
 */
public record MesaRequest(
        @NotNull(message = "El número es obligatorio")
        @Min(value = 1, message = "El número debe ser mayor que 0")
        Integer numero,

        @NotNull(message = "La capacidad es obligatoria")
        @Min(value = 1, message = "La capacidad debe ser de al menos 1 persona")
        @Max(value = 30, message = "La capacidad máxima es de 30 personas")
        Integer capacidad,

        @NotBlank(message = "La zona es obligatoria")
        @Size(max = 30, message = "La zona admite hasta 30 caracteres")
        String zona
) {
}
