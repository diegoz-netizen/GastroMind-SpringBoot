package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.MesaResponse;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.repository.MesaRepository;
import com.gastromind.backendspring.security.EmpleadoActual;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lectura de las mesas del salón para la HU-09 (el mozo elige la mesa del pedido).
 * Crear, editar y borrar mesas es de la HU-26.
 */
@Service
public class MesaService {

    private static final String MOZO = "MOZO";
    private static final String ADMINISTRADOR = "ADMINISTRADOR";

    private final EmpleadoActual empleadoActual;
    private final MesaRepository mesaRepository;

    public MesaService(EmpleadoActual empleadoActual, MesaRepository mesaRepository) {
        this.empleadoActual = empleadoActual;
        this.mesaRepository = mesaRepository;
    }

    // El restaurante sale del token, nunca del cliente: nadie ve las mesas de otro restaurante
    @Transactional(readOnly = true)
    public List<MesaResponse> listar(Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, MOZO, ADMINISTRADOR);
        return mesaRepository.findByRestauranteIdOrderByNumeroAsc(empleado.getRestaurante().getId()).stream()
                .map(MesaResponse::from)
                .toList();
    }
}
