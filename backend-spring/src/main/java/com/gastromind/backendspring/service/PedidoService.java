package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.CambioEstadoPlatilloRequest;
import com.gastromind.backendspring.dto.PedidoRequest;
import com.gastromind.backendspring.dto.PedidoResponse;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.EstadoPedido;
import com.gastromind.backendspring.entity.EstadoPlatillo;
import com.gastromind.backendspring.entity.Mesa;
import com.gastromind.backendspring.entity.Pedido;
import com.gastromind.backendspring.entity.PedidoDetalle;
import com.gastromind.backendspring.entity.Producto;
import com.gastromind.backendspring.repository.MesaRepository;
import com.gastromind.backendspring.repository.PedidoRepository;
import com.gastromind.backendspring.repository.ProductoRepository;
import com.gastromind.backendspring.security.EmpleadoActual;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Base de pedidos del Sprint 3: crear un pedido y cambiar el estado de cada platillo.
 * La usan la HU-09 (mozo), la HU-10 y la HU-11 (cocina), la HU-12 (cerrar la mesa) y la HU-13 (descuento al servir).
 * El descuento de stock no va aquí: la HU-13 lo hace con InventarioService.registrarConsumo.
 */
@Service
public class PedidoService {

    private static final String MOZO = "MOZO";
    private static final String COCINERO = "COCINERO";
    private static final String ADMINISTRADOR = "ADMINISTRADOR";

    // Quién puede hacer cada paso. ANULADO solo antes de cocinar: lo ya preparado es una merma (HU-18).
    private static final Map<EstadoPlatillo, Map<EstadoPlatillo, Set<String>>> TRANSICIONES = Map.of(
            EstadoPlatillo.PENDIENTE, Map.of(
                    EstadoPlatillo.EN_PREPARACION, Set.of(COCINERO, ADMINISTRADOR),
                    EstadoPlatillo.ANULADO, Set.of(MOZO, ADMINISTRADOR)),
            EstadoPlatillo.EN_PREPARACION, Map.of(
                    EstadoPlatillo.LISTO, Set.of(COCINERO, ADMINISTRADOR)),
            EstadoPlatillo.LISTO, Map.of(
                    EstadoPlatillo.SERVIDO, Set.of(MOZO, ADMINISTRADOR)));

    private final EmpleadoActual empleadoActual;
    private final MesaRepository mesaRepository;
    private final ProductoRepository productoRepository;
    private final PedidoRepository pedidoRepository;

    public PedidoService(EmpleadoActual empleadoActual,
                         MesaRepository mesaRepository,
                         ProductoRepository productoRepository,
                         PedidoRepository pedidoRepository) {
        this.empleadoActual = empleadoActual;
        this.mesaRepository = mesaRepository;
        this.productoRepository = productoRepository;
        this.pedidoRepository = pedidoRepository;
    }

    @Transactional
    public PedidoResponse crear(PedidoRequest request, Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, MOZO, ADMINISTRADOR);
        Long restauranteId = empleado.getRestaurante().getId();

        // Mesa o platillo de otro restaurante se tratan como inexistentes (no se revela que existen)
        Mesa mesa = mesaRepository.findWithLockByIdAndRestauranteId(request.mesaId(), restauranteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mesa no encontrada"));
        if (!Mesa.LIBRE.equals(mesa.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La mesa no está libre");
        }

        Pedido pedido = Pedido.builder().mesa(mesa).empleado(empleado).build();
        Set<Long> repetidos = new HashSet<>();
        for (PedidoRequest.Item item : request.items()) {
            if (!repetidos.add(item.productoId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hay un platillo repetido en el pedido");
            }
            Producto producto = productoRepository.findByIdAndCategoriaRestauranteId(item.productoId(), restauranteId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Platillo no encontrado"));
            if (!Producto.ACTIVO.equals(producto.getEstado())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El platillo no está disponible");
            }
            pedido.getDetalles().add(PedidoDetalle.builder()
                    .pedido(pedido).producto(producto).cantidad(item.cantidad()).build());
        }

        mesa.setEstado(Mesa.OCUPADA);
        return PedidoResponse.from(pedidoRepository.saveAndFlush(pedido));
    }

    @Transactional
    public PedidoResponse cambiarEstadoPlatillo(Long pedidoId, Long detalleId, CambioEstadoPlatilloRequest request,
                                                Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, MOZO, COCINERO, ADMINISTRADOR);
        Long restauranteId = empleado.getRestaurante().getId();

        Pedido pedido = pedidoRepository.findWithLockByIdAndMesaRestauranteId(pedidoId, restauranteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido no encontrado"));
        PedidoDetalle detalle = pedido.getDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Platillo no encontrado"));

        EstadoPlatillo nuevo = leerEstado(request.estado());
        if (pedido.getEstado() == EstadoPedido.CERRADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El pedido ya está cerrado");
        }
        Set<String> roles = TRANSICIONES.getOrDefault(detalle.getEstado(), Map.of()).get(nuevo);
        if (roles == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un platillo " + detalle.getEstado() + " no puede pasar a " + nuevo);
        }
        if (!roles.contains(empleado.getRol().getNombre().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Su rol no puede hacer este cambio");
        }

        detalle.setEstado(nuevo);
        pedido.setEstado(estadoDelPedido(pedido.getDetalles(), pedido.getEstado()));
        return PedidoResponse.from(pedidoRepository.saveAndFlush(pedido));
    }

    private EstadoPlatillo leerEstado(String estado) {
        try {
            return EstadoPlatillo.valueOf(estado.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de platillo no válido");
        }
    }

    // Los anulados no cuentan. Si se anularon todos, el pedido queda como estaba y lo cierra la HU-12.
    private EstadoPedido estadoDelPedido(List<PedidoDetalle> detalles, EstadoPedido actual) {
        List<EstadoPlatillo> vigentes = detalles.stream()
                .map(PedidoDetalle::getEstado)
                .filter(estado -> estado != EstadoPlatillo.ANULADO)
                .toList();
        if (vigentes.isEmpty()) {
            return actual;
        }
        if (vigentes.stream().allMatch(estado -> estado == EstadoPlatillo.SERVIDO)) {
            return EstadoPedido.SERVIDO;
        }
        return vigentes.stream().allMatch(estado -> estado == EstadoPlatillo.PENDIENTE)
                ? EstadoPedido.ABIERTO : EstadoPedido.EN_PREPARACION;
    }
}
