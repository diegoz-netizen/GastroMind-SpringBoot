package com.gastromind.backendspring.dto;

import com.gastromind.backendspring.entity.ConteoCiclico;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** HU-30: un conteo físico con la diferencia contra el sistema (contado − sistema). */
public record ConteoResponse(
        Long id,
        Long ingredienteId,
        String insumo,
        String unidadMedida,
        BigDecimal cantidadContada,
        BigDecimal stockSistema,
        BigDecimal diferencia,
        LocalDateTime fechaRegistro,
        String registradoPor
) {
    public static ConteoResponse from(ConteoCiclico conteo) {
        return new ConteoResponse(conteo.getId(), conteo.getIngrediente().getId(), conteo.getIngrediente().getNombre(),
                conteo.getIngrediente().getUnidadMedida(), conteo.getCantidadFisicaContada(), conteo.getStockSistema(),
                conteo.getDiferencia(), conteo.getFechaRegistro(), conteo.getEmpleado().getNombreCompleto());
    }
}
