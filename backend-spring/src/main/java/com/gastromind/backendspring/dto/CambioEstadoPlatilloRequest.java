package com.gastromind.backendspring.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Base de pedidos: estado nuevo de un platillo. Las transiciones válidas las revisa PedidoService.
 */
public record CambioEstadoPlatilloRequest(
        @NotBlank(message = "El estado es obligatorio")
        String estado
) {}
