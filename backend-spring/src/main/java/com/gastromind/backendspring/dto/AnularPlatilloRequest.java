package com.gastromind.backendspring.dto;

/**
 * HU-18: anular un platillo. El motivo de merma (GET /api/mermas/motivos) es obligatorio si el platillo ya entró a
 * cocina (EN_PREPARACION o LISTO), porque sus insumos se registran como merma. Si sigue PENDIENTE, no hace falta.
 */
public record AnularPlatilloRequest(Long motivoId) {
}
