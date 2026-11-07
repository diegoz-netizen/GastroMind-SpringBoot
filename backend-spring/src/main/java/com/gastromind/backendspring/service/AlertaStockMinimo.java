package com.gastromind.backendspring.service;

import java.math.BigDecimal;

/**
 * HU-16: un insumo acaba de llegar a su stock mínimo (antes estaba por encima).
 * Lo publica InventarioService; AlertaService manda el correo cuando la transacción se confirma.
 */
public record AlertaStockMinimo(Long restauranteId, String insumo, String unidad,
                                BigDecimal stockActual, BigDecimal stockMinimo) {
}
