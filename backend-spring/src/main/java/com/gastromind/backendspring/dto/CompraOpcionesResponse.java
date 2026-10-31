package com.gastromind.backendspring.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * HU-14: lo que necesita el formulario de ingreso. Los proveedores se administran en la HU-22 (Sprint 4),
 * así que mientras tanto el formulario los toma de aquí.
 */
public record CompraOpcionesResponse(List<ProveedorOpcion> proveedores, List<InsumoOpcion> insumos) {

    public record ProveedorOpcion(Long id, String nombre) {}

    public record InsumoOpcion(Long id, String nombre, String unidadMedida, BigDecimal stockActual) {}
}
