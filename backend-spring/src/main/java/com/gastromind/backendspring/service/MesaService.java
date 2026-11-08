package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.MesaRequest;
import com.gastromind.backendspring.dto.MesaResponse;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Mesa;
import com.gastromind.backendspring.repository.MesaRepository;
import com.gastromind.backendspring.security.EmpleadoActual;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Mesas del salón. HU-09: el mozo las lista para elegir la del pedido.
 * HU-26: el administrador las registra y las edita (número, capacidad y zona).
 * El restaurante sale siempre del token, nunca del cliente.
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

    @Transactional(readOnly = true)
    public List<MesaResponse> listar(Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, MOZO, ADMINISTRADOR);
        return mesaRepository.findByRestauranteIdOrderByNumeroAsc(empleado.getRestaurante().getId()).stream()
                .map(MesaResponse::from)
                .toList();
    }

    /** HU-26: nueva mesa LIBRE. Número repetido en el restaurante → 409. */
    @Transactional
    public MesaResponse crear(MesaRequest request, Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, ADMINISTRADOR);
        validarNumeroLibre(empleado.getRestaurante().getId(), request.numero());

        Mesa mesa = Mesa.builder()
                .restaurante(empleado.getRestaurante())
                .numero(request.numero())
                .capacidad(request.capacidad())
                .zona(request.zona().trim())
                .build();
        return MesaResponse.from(mesaRepository.saveAndFlush(mesa));
    }

    /**
     * HU-26: cambia número, capacidad y zona. El estado no se toca (lo cambian los pedidos).
     * Una mesa OCUPADA no cambia de número, porque el mozo y la cocina la siguen con el que tenía (409).
     * Una mesa de otro restaurante se trata como inexistente (404).
     */
    @Transactional
    public MesaResponse editar(Long id, MesaRequest request, Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, ADMINISTRADOR);
        Long restauranteId = empleado.getRestaurante().getId();

        // Bloqueada: no se cruza con un mozo que la está ocupando en ese momento
        Mesa mesa = mesaRepository.findWithLockByIdAndRestauranteId(id, restauranteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mesa no encontrada"));

        if (!mesa.getNumero().equals(request.numero())) {
            if (Mesa.OCUPADA.equals(mesa.getEstado())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "La mesa " + mesa.getNumero() + " está ocupada: su número no se puede cambiar");
            }
            validarNumeroLibre(restauranteId, request.numero());
        }

        mesa.setNumero(request.numero());
        mesa.setCapacidad(request.capacidad());
        mesa.setZona(request.zona().trim());
        return MesaResponse.from(mesaRepository.saveAndFlush(mesa));
    }

    private void validarNumeroLibre(Long restauranteId, Integer numero) {
        if (mesaRepository.existsByRestauranteIdAndNumero(restauranteId, numero)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe la mesa " + numero);
        }
    }
}
