package com.gastromind.backendspring.dto;

import com.gastromind.backendspring.entity.EstadoPlatillo;
import com.gastromind.backendspring.entity.Pedido;
import com.gastromind.backendspring.entity.PedidoDetalle;

import java.math.BigDecimal;
import java.util.List;

/**
 * HU-12 (CA-12): cuenta de la mesa al cerrarla. Suma solo los platillos servidos, al precio de la carta.
 */
public record CuentaResponse(
        Long pedidoId,
        Long mesaId,
        Integer mesaNumero,
        String estado,
        List<Linea> lineas,
        BigDecimal total
) {
    public record Linea(Long productoId, String producto, Integer cantidad, BigDecimal precioUnitario,
                        BigDecimal subtotal) {
        static Linea from(PedidoDetalle detalle) {
            BigDecimal precio = detalle.getProducto().getPrecio();
            return new Linea(detalle.getProducto().getId(), detalle.getProducto().getNombre(), detalle.getCantidad(),
                    precio, precio.multiply(BigDecimal.valueOf(detalle.getCantidad())));
        }
    }

    public static CuentaResponse from(Pedido pedido) {
        List<Linea> lineas = pedido.getDetalles().stream()
                .filter(detalle -> detalle.getEstado() == EstadoPlatillo.SERVIDO)
                .map(Linea::from)
                .toList();
        BigDecimal total = lineas.stream().map(Linea::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CuentaResponse(pedido.getId(), pedido.getMesa().getId(), pedido.getMesa().getNumero(),
                pedido.getEstado().name(), lineas, total);
    }
}
