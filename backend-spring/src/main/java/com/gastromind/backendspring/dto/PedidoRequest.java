package com.gastromind.backendspring.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

/**
 * Base de pedidos (CA-09): mesa y platillos. El restaurante y quién toma el pedido salen del token.
 */
public record PedidoRequest(
        @NotNull(message = "La mesa es obligatoria")
        Long mesaId,

        @NotEmpty(message = "El pedido debe tener al menos un platillo")
        List<@NotNull(message = "El platillo es obligatorio") @Valid Item> items
) {
    public record Item(
            @NotNull(message = "El platillo es obligatorio")
            Long productoId,

            @NotNull(message = "La cantidad es obligatoria")
            @Positive(message = "La cantidad debe ser mayor que 0")
            Integer cantidad
    ) {}
}
