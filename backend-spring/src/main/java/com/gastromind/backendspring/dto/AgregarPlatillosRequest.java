package com.gastromind.backendspring.dto;

import com.gastromind.backendspring.dto.PedidoRequest.Item;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * HU-09, segunda ronda: platillos que se suman al pedido abierto de una mesa ocupada.
 */
public record AgregarPlatillosRequest(
        @NotEmpty(message = "Agregue al menos un platillo")
        List<@NotNull(message = "El platillo es obligatorio") @Valid Item> items
) {}
