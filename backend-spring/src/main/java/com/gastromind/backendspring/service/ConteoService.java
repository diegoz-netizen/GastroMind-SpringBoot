package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.ConteoRequest;
import com.gastromind.backendspring.dto.ConteoResponse;
import com.gastromind.backendspring.entity.ConteoCiclico;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.repository.ConteoCiclicoRepository;
import com.gastromind.backendspring.repository.IngredienteRepository;
import com.gastromind.backendspring.security.EmpleadoActual;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * HU-30 (CA-30): el almacenero registra lo que contó de un insumo. Se guarda junto con el stock del sistema en ese
 * momento, así la diferencia queda registrada. El conteo no cambia el stock: la diferencia la explica el reporte
 * teórico contra real (HU-20). Lo hacen el ALMACENERO y el ADMINISTRADOR.
 */
@Service
public class ConteoService {

    private static final String[] ROLES = {"ALMACENERO", "ADMINISTRADOR"};

    private final EmpleadoActual empleadoActual;
    private final IngredienteRepository ingredienteRepository;
    private final ConteoCiclicoRepository conteoRepository;
    private final EntityManager entityManager;

    public ConteoService(EmpleadoActual empleadoActual, IngredienteRepository ingredienteRepository,
                         ConteoCiclicoRepository conteoRepository, EntityManager entityManager) {
        this.empleadoActual = empleadoActual;
        this.ingredienteRepository = ingredienteRepository;
        this.conteoRepository = conteoRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public ConteoResponse registrar(ConteoRequest request, Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, ROLES);
        Ingrediente insumo = insumoDelRestaurante(request.ingredienteId(), empleado);
        // Mismo bloqueo que InventarioService: el stock que se guarda es el de ese instante, no uno a medio servir
        entityManager.lock(insumo, LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(insumo);

        ConteoCiclico conteo = conteoRepository.saveAndFlush(ConteoCiclico.builder()
                .empleado(empleado)
                .ingrediente(insumo)
                .cantidadFisicaContada(request.cantidad().setScale(InventarioService.ESCALA))
                .stockSistema(insumo.getStockActual().setScale(InventarioService.ESCALA))
                .build());
        return ConteoResponse.from(conteo);
    }

    @Transactional(readOnly = true)
    public List<ConteoResponse> listar(Long ingredienteId, Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, ROLES);
        Long restauranteId = insumoDelRestaurante(ingredienteId, empleado).getRestaurante().getId();
        return conteoRepository
                .findTop20ByIngredienteIdAndIngredienteRestauranteIdOrderByFechaRegistroDescIdDesc(ingredienteId,
                        restauranteId)
                .stream().map(ConteoResponse::from).toList();
    }

    // Un insumo de otro restaurante se trata como inexistente (no se revela que existe)
    private Ingrediente insumoDelRestaurante(Long ingredienteId, Empleado empleado) {
        return ingredienteRepository.findByIdAndRestauranteId(ingredienteId, empleado.getRestaurante().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado"));
    }
}
