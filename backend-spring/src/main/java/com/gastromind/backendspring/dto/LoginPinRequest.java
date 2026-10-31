package com.gastromind.backendspring.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** HU-27: ingreso a la app Kotlin con el correo y el PIN de 4 dígitos (el PIN no es único, el correo sí). */
public record LoginPinRequest(
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El formato del correo es inválido")
        String correo,

        @NotBlank(message = "El PIN es obligatorio")
        @Pattern(regexp = "\\d{4}", message = "El PIN debe tener 4 dígitos")
        String pin
) {}
