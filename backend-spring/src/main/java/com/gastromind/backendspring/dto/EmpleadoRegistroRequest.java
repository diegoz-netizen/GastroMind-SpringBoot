package com.gastromind.backendspring.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * HU-01. Sin contraseña: el empleado la crea con el enlace del correo de bienvenida (HU-01-b).
 * El PIN es opcional; si no viene, se genera uno.
 */
public record EmpleadoRegistroRequest(
        @NotBlank(message = "El nombre completo es obligatorio")
        String nombreCompleto,

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El formato del correo es inválido")
        String correo,

        @NotNull(message = "El ID del rol es obligatorio")
        Long rolId,

        @Pattern(regexp = "\\d{4}", message = "El PIN debe tener 4 dígitos")
        String pinAcceso
) {}