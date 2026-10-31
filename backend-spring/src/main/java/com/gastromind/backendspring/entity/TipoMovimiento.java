package com.gastromind.backendspring.entity;

/**
 * Tipos de movimiento_inventario (CHECK del script). El signo de la cantidad lo pone el tipo:
 * INGRESO suma; CONSUMO y MERMA restan; AJUSTE puede ir a cualquier lado (saldo inicial o conteo físico).
 */
public enum TipoMovimiento {
    INGRESO,   // HU-14: compra recibida en el almacén
    CONSUMO,   // HU-13: platillo servido, descuenta su receta
    MERMA,     // HU-17 y HU-18: pérdida registrada
    AJUSTE     // saldo inicial (migración 005) y conteo físico
}
