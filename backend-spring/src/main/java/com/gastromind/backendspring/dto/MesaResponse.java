package com.gastromind.backendspring.dto;

import com.gastromind.backendspring.entity.Mesa;

/**
 * Una mesa del salón: id, número y si está LIBRE u OCUPADA (lo que usa la app del mozo en la HU-09),
 * más su capacidad y su zona (HU-26).
 */
public record MesaResponse(Long id, Integer numero, String estado, Integer capacidad, String zona) {

    public static MesaResponse from(Mesa mesa) {
        return new MesaResponse(mesa.getId(), mesa.getNumero(), mesa.getEstado(), mesa.getCapacidad(), mesa.getZona());
    }
}
