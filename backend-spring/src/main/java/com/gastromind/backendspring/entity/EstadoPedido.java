package com.gastromind.backendspring.entity;

/**
 * Estado del pedido (CHECK de pedido.estado). Sale del estado de sus platillos; CERRADO lo pone la HU-12.
 */
public enum EstadoPedido {
    ABIERTO,
    EN_PREPARACION,
    SERVIDO,
    CERRADO
}
