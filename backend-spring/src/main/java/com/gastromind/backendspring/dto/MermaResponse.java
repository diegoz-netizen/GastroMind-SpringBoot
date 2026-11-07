package com.gastromind.backendspring.dto;

import java.math.BigDecimal;

/**
 * HU-17: la merma registrada, con el stock que quedó y lo que costó (cantidad x costo unitario del insumo).
 * Mismos campos que usa la app de la demo, más el responsable.
 */
public record MermaResponse(Long id, String insumo, BigDecimal cantidad, String unidadMedida, String motivo,
                            BigDecimal stockDespues, BigDecimal costo, String registradoPor) {}
