package com.gastromind.backendspring.dto;

import com.gastromind.backendspring.entity.Mesa;

/**
 * Lo que la app del mozo necesita para elegir una mesa: su id, su número y si está LIBRE u OCUPADA.
 */
public record MesaResponse(Long id, Integer numero, String estado) {

    public static MesaResponse from(Mesa mesa) {
        return new MesaResponse(mesa.getId(), mesa.getNumero(), mesa.getEstado());
    }
}
