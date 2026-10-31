package com.gastromind.backendspring.dto;

/** pinAcceso solo viene al registrar: es la única vez que el admin lo ve (HU-01-b); en la BD queda con hash. */
public record EmpleadoResponse(
        Long id,
        String nombreCompleto,
        String correo,
        String rol,
        Long restauranteId,
        String estado,
        String pinAcceso
) {}