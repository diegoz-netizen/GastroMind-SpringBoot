package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.CompraOpcionesResponse;
import com.gastromind.backendspring.dto.IngresoCompraRequest;
import com.gastromind.backendspring.dto.IngresoCompraResponse;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.MovimientoInventario;
import com.gastromind.backendspring.entity.Proveedor;
import com.gastromind.backendspring.entity.RegistroIngresoProveedor;
import com.gastromind.backendspring.repository.IngredienteRepository;
import com.gastromind.backendspring.repository.ProveedorRepository;
import com.gastromind.backendspring.repository.RegistroIngresoProveedorRepository;
import com.gastromind.backendspring.security.EmpleadoActual;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

/**
 * HU-14 (CA-21): registrar el ingreso de una compra al almacén. Guarda la compra y sube el stock con
 * InventarioService en una sola transacción: si el movimiento falla, la compra tampoco queda.
 * Lo hacen el ALMACENERO y el ADMINISTRADOR. No cambia ingrediente.costo_unitario (decisión del 28/10:
 * el costo de cada compra queda en costo_total y el costo promedio se ve con la HU-22).
 */
@Service
public class CompraService {

    private static final String[] ROLES = {"ALMACENERO", "ADMINISTRADOR"};

    private final EmpleadoActual empleadoActual;
    private final ProveedorRepository proveedorRepository;
    private final IngredienteRepository ingredienteRepository;
    private final RegistroIngresoProveedorRepository registroRepository;
    private final InventarioService inventarioService;

    public CompraService(EmpleadoActual empleadoActual,
                         ProveedorRepository proveedorRepository,
                         IngredienteRepository ingredienteRepository,
                         RegistroIngresoProveedorRepository registroRepository,
                         InventarioService inventarioService) {
        this.empleadoActual = empleadoActual;
        this.proveedorRepository = proveedorRepository;
        this.ingredienteRepository = ingredienteRepository;
        this.registroRepository = registroRepository;
        this.inventarioService = inventarioService;
    }

    @Transactional
    public IngresoCompraResponse registrar(IngresoCompraRequest request, Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, ROLES);
        Long restauranteId = empleado.getRestaurante().getId();

        // Proveedor o insumo de otro restaurante se tratan como inexistentes (no se revela que existen)
        Proveedor proveedor = proveedorRepository.findByIdAndRestauranteId(request.proveedorId(), restauranteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proveedor no encontrado"));
        Ingrediente insumo = ingredienteRepository.findByIdAndRestauranteId(request.ingredienteId(), restauranteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado"));

        // Un lote ya vencido no entra al almacén; el que vence hoy sí (la HU-16 lo avisa)
        if (request.fechaVencimiento() != null && request.fechaVencimiento().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de vencimiento ya pasó");
        }

        RegistroIngresoProveedor registro = registroRepository.save(RegistroIngresoProveedor.builder()
                .empleado(empleado)
                .proveedor(proveedor)
                .ingrediente(insumo)
                .lote(request.lote() == null || request.lote().isBlank() ? null : request.lote().trim())
                .fechaVencimiento(request.fechaVencimiento())
                .cantidadRecibida(request.cantidad().setScale(InventarioService.ESCALA))
                .costoTotal(request.costoTotal().setScale(2))
                .build());

        MovimientoInventario movimiento = inventarioService.registrarIngreso(registro, empleado);
        return IngresoCompraResponse.from(registro, movimiento.getSaldo());
    }

    @Transactional(readOnly = true)
    public List<IngresoCompraResponse> listar(Authentication authentication) {
        Long restauranteId = empleadoActual.obtenerConRol(authentication, ROLES).getRestaurante().getId();
        return registroRepository.findByIngredienteRestauranteIdOrderByFechaRegistroDescIdDesc(restauranteId)
                .stream()
                .map(registro -> IngresoCompraResponse.from(registro, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public CompraOpcionesResponse opciones(Authentication authentication) {
        Long restauranteId = empleadoActual.obtenerConRol(authentication, ROLES).getRestaurante().getId();
        return new CompraOpcionesResponse(
                proveedorRepository.findByRestauranteIdOrderByNombreAsc(restauranteId).stream()
                        .map(p -> new CompraOpcionesResponse.ProveedorOpcion(p.getId(), p.getNombre()))
                        .toList(),
                ingredienteRepository.findByRestauranteIdOrderByNombreAsc(restauranteId).stream()
                        .map(i -> new CompraOpcionesResponse.InsumoOpcion(
                                i.getId(), i.getNombre(), i.getUnidadMedida(), i.getStockActual()))
                        .toList());
    }
}
