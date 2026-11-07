package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.MermaRequest;
import com.gastromind.backendspring.dto.MermaResponse;
import com.gastromind.backendspring.dto.MotivoMermaResponse;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.MotivoMerma;
import com.gastromind.backendspring.entity.MovimientoInventario;
import com.gastromind.backendspring.entity.RegistroMerma;
import com.gastromind.backendspring.repository.IngredienteRepository;
import com.gastromind.backendspring.repository.MotivoMermaRepository;
import com.gastromind.backendspring.repository.RegistroMermaRepository;
import com.gastromind.backendspring.security.EmpleadoActual;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Base de mermas (HU-17 y HU-18): guarda el registro_merma y descuenta el stock con InventarioService
 * en una sola transacción; si el movimiento falla, la merma tampoco queda.
 * HU-17 (CA-17): el almacenero, el cocinero o el administrador registran insumo, cantidad y motivo
 * (obligatorio); el responsable es quien hace la petición.
 * La HU-18 llama a {@link #registrar(Ingrediente, BigDecimal, MotivoMerma, Empleado)} con PLATO_ANULADO.
 */
@Service
public class MermaService {

    private static final String[] ROLES = {"ALMACENERO", "COCINERO", "ADMINISTRADOR"};

    private final EmpleadoActual empleadoActual;
    private final IngredienteRepository ingredienteRepository;
    private final MotivoMermaRepository motivoRepository;
    private final RegistroMermaRepository mermaRepository;
    private final InventarioService inventarioService;

    public MermaService(EmpleadoActual empleadoActual,
                        IngredienteRepository ingredienteRepository,
                        MotivoMermaRepository motivoRepository,
                        RegistroMermaRepository mermaRepository,
                        InventarioService inventarioService) {
        this.empleadoActual = empleadoActual;
        this.ingredienteRepository = ingredienteRepository;
        this.motivoRepository = motivoRepository;
        this.mermaRepository = mermaRepository;
        this.inventarioService = inventarioService;
    }

    @Transactional(readOnly = true)
    public List<MotivoMermaResponse> motivos(Authentication authentication) {
        Long restauranteId = empleadoActual.obtenerConRol(authentication, ROLES).getRestaurante().getId();
        return motivoRepository.disponibles(restauranteId).stream()
                .map(m -> new MotivoMermaResponse(m.getId(), m.getNombre()))
                .toList();
    }

    @Transactional
    public MermaResponse registrar(MermaRequest request, Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, ROLES);
        Long restauranteId = empleado.getRestaurante().getId();

        // Insumo de otro restaurante se trata como inexistente (no se revela que existe)
        Ingrediente insumo = ingredienteRepository.findByIdAndRestauranteId(request.ingredienteId(), restauranteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado"));
        MotivoMerma motivo = motivoDisponible(request.motivoId(), empleado);

        return registrar(insumo, request.cantidad(), motivo, empleado);
    }

    /** HU-17 y HU-18: el motivo elegido, si es global o del restaurante del empleado; si no, 400. */
    @Transactional(readOnly = true)
    public MotivoMerma motivoDisponible(Long motivoId, Empleado empleado) {
        if (motivoId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El motivo es obligatorio");
        }
        return motivoRepository.disponibles(empleado.getRestaurante().getId()).stream()
                .filter(m -> m.getId().equals(motivoId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Motivo de merma no válido"));
    }

    /** Base para la HU-17 y la HU-18: el insumo y el motivo ya vienen validados por quien llama. */
    @Transactional
    public MermaResponse registrar(Ingrediente insumo, BigDecimal cantidad, MotivoMerma motivo, Empleado empleado) {
        if (cantidad == null || cantidad.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser mayor que 0");
        }
        // No se redondea a escondidas (misma regla que InventarioService)
        if (cantidad.stripTrailingZeros().scale() > InventarioService.ESCALA) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad admite hasta 3 decimales");
        }
        RegistroMerma merma = mermaRepository.save(RegistroMerma.builder()
                .empleado(empleado)
                .ingrediente(insumo)
                .cantidad(cantidad.setScale(InventarioService.ESCALA))
                .motivo(motivo)
                .build());

        MovimientoInventario movimiento = inventarioService.registrarMerma(merma, empleado);
        BigDecimal costo = merma.getCantidad().multiply(insumo.getCostoUnitario()).setScale(2, RoundingMode.HALF_UP);
        return new MermaResponse(merma.getId(), insumo.getNombre(), merma.getCantidad(), insumo.getUnidadMedida(),
                motivo.getNombre(), movimiento.getSaldo(), costo, empleado.getNombreCompleto());
    }
}
