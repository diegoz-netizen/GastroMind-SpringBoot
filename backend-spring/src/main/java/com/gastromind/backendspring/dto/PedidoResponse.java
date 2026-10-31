package com.gastromind.backendspring.dto;

import com.gastromind.backendspring.entity.Pedido;
import com.gastromind.backendspring.entity.PedidoDetalle;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Pedido con sus platillos, tal como quedó después de la operación.
 */
public record PedidoResponse(
        Long id,
        Long mesaId,
        Integer mesaNumero,
        Long empleadoId,
        String estado,
        LocalDateTime fechaRegistro,
        List<Detalle> detalles
) {
    public record Detalle(Long id, Long productoId, String producto, Integer cantidad, String estado) {
        static Detalle from(PedidoDetalle detalle) {
            return new Detalle(detalle.getId(), detalle.getProducto().getId(), detalle.getProducto().getNombre(),
                    detalle.getCantidad(), detalle.getEstado().name());
        }
    }

    public static PedidoResponse from(Pedido pedido) {
        return new PedidoResponse(pedido.getId(), pedido.getMesa().getId(), pedido.getMesa().getNumero(),
                pedido.getEmpleado().getId(), pedido.getEstado().name(), pedido.getFechaRegistro(),
                pedido.getDetalles().stream().map(Detalle::from).toList());
    }
}
