package com.gastromind.backendspring.entity;

/**
 * Estado de cada platillo de un pedido (CHECK de pedido_detalle.estado).
 */
public enum EstadoPlatillo {
    PENDIENTE,
    EN_PREPARACION,
    LISTO,
    SERVIDO,
    ANULADO
}
