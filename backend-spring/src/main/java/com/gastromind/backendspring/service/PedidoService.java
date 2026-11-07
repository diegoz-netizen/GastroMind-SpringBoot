package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.AgregarPlatillosRequest;
import com.gastromind.backendspring.dto.AnularPlatilloRequest;
import com.gastromind.backendspring.dto.CambioEstadoPlatilloRequest;
import com.gastromind.backendspring.dto.CuentaResponse;
import com.gastromind.backendspring.dto.PedidoRequest;
import com.gastromind.backendspring.dto.PedidoResponse;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.EstadoPedido;
import com.gastromind.backendspring.entity.EstadoPlatillo;
import com.gastromind.backendspring.entity.Mesa;
import com.gastromind.backendspring.entity.MotivoMerma;
import com.gastromind.backendspring.entity.Pedido;
import com.gastromind.backendspring.entity.PedidoDetalle;
import com.gastromind.backendspring.entity.Producto;
import com.gastromind.backendspring.entity.RecetaDetalle;
import com.gastromind.backendspring.repository.MesaRepository;
import com.gastromind.backendspring.repository.PedidoRepository;
import com.gastromind.backendspring.repository.ProductoRepository;
import com.gastromind.backendspring.repository.RecetaDetalleRepository;
import com.gastromind.backendspring.security.EmpleadoActual;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Base de pedidos del Sprint 3: crear un pedido, sumarle una segunda ronda, listar los vigentes y cambiar el
 * estado de cada platillo.
 * La usan la HU-09 (mozo), la HU-10 y la HU-11 (cocina), la HU-12 (cerrar la mesa) y la HU-13 (descuento al servir).
 * HU-13: al pasar un platillo a SERVIDO se descuenta su receta con InventarioService, en la misma transacción.
 * HU-18: un platillo que ya entró a cocina y se anula registra sus insumos como merma, con MermaService.
 */
@Service
public class PedidoService {

    private static final Logger log = LoggerFactory.getLogger(PedidoService.class);

    // Se descuenta por receta solo lo RECETA; lo LIBRE se controla por dotación y conteo (HU-25)
    private static final String CONTROL_RECETA = "RECETA";
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
    private final RecetaDetalleRepository recetaDetalleRepository;
    private final InventarioService inventarioService;
    private final MermaService mermaService;

    public PedidoService(EmpleadoActual empleadoActual,
                         MesaRepository mesaRepository,
                         ProductoRepository productoRepository,
                         PedidoRepository pedidoRepository,
                         RecetaDetalleRepository recetaDetalleRepository,
                         InventarioService inventarioService,
                         MermaService mermaService) {
        this.empleadoActual = empleadoActual;
        this.mesaRepository = mesaRepository;
        this.productoRepository = productoRepository;
        this.pedidoRepository = pedidoRepository;
        this.recetaDetalleRepository = recetaDetalleRepository;
        this.inventarioService = inventarioService;
        this.mermaService = mermaService;
    }

    // Pedidos sin cerrar, el más antiguo primero: la comanda de cocina (HU-10) y lo que ve el mozo (HU-11)
    @Transactional(readOnly = true)
    public List<PedidoResponse> listarVigentes(Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, MOZO, COCINERO, ADMINISTRADOR);
        return pedidoRepository.findByMesaRestauranteIdAndEstadoNotOrderByFechaRegistroAscIdAsc(
                        empleado.getRestaurante().getId(), EstadoPedido.CERRADO)
                .stream().map(PedidoResponse::from).toList();
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
        agregarItems(pedido, request.items(), restauranteId);

        mesa.setEstado(Mesa.OCUPADA);
        return PedidoResponse.from(pedidoRepository.saveAndFlush(pedido));
    }

    /**
     * HU-09, segunda ronda: la mesa ocupada pide más y se suma a su pedido abierto, en vez de abrir otro
     * (decisión del PO sobre la base de pedidos, punto 1). Lo nuevo entra PENDIENTE y va a cocina como cualquier
     * platillo. Un platillo que ya está en el pedido puede volver a pedirse: es otra línea, con su propio estado.
     */
    @Transactional
    public PedidoResponse agregarPlatillos(Long pedidoId, AgregarPlatillosRequest request,
                                           Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, MOZO, ADMINISTRADOR);
        Long restauranteId = empleado.getRestaurante().getId();

        Pedido pedido = pedidoRepository.findWithLockByIdAndMesaRestauranteId(pedidoId, restauranteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido no encontrado"));
        if (pedido.getEstado() == EstadoPedido.CERRADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El pedido ya está cerrado");
        }

        agregarItems(pedido, request.items(), restauranteId);
        pedido.setEstado(estadoDelPedido(pedido.getDetalles(), pedido.getEstado()));
        return PedidoResponse.from(pedidoRepository.saveAndFlush(pedido));
    }

    // Repetido dentro de la misma ronda: 400 (se usa la cantidad). Otro restaurante: 404. Inactivo: 409.
    // Se valida todo antes de tocar el pedido, para que un rechazo no deje platillos a medias.
    private void agregarItems(Pedido pedido, List<PedidoRequest.Item> items, Long restauranteId) {
        List<PedidoDetalle> nuevos = new ArrayList<>();
        Set<Long> repetidos = new HashSet<>();
        for (PedidoRequest.Item item : items) {
            if (!repetidos.add(item.productoId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hay un platillo repetido en el pedido");
            }
            Producto producto = productoRepository.findByIdAndCategoriaRestauranteId(item.productoId(), restauranteId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Platillo no encontrado"));
            if (!Producto.ACTIVO.equals(producto.getEstado())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El platillo no está disponible");
            }
            nuevos.add(PedidoDetalle.builder().pedido(pedido).producto(producto).cantidad(item.cantidad()).build());
        }
        pedido.getDetalles().addAll(nuevos);
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
        if (nuevo == EstadoPlatillo.SERVIDO) {
            descontarReceta(detalle, empleado);
        }
        pedido.setEstado(estadoDelPedido(pedido.getDetalles(), pedido.getEstado()));
        return PedidoResponse.from(pedidoRepository.saveAndFlush(pedido));
    }

    /**
     * HU-12 (CA-12): el mozo cierra la mesa. El pedido pasa a CERRADO, la mesa vuelve a LIBRE y se devuelve la cuenta
     * con lo servido. Un pedido cerrado ya no acepta platillos ni cambios de estado.
     * No se cierra con platillos sin servir (409, dice cuáles): se servirían sin cobrar o se perderían en cocina.
     * Los anulados no cuentan, así que un pedido con todo anulado se cierra con total 0 y libera la mesa.
     */
    @Transactional
    public CuentaResponse cerrar(Long pedidoId, Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, MOZO, ADMINISTRADOR);
        Long restauranteId = empleado.getRestaurante().getId();

        Pedido pedido = pedidoRepository.findWithLockByIdAndMesaRestauranteId(pedidoId, restauranteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido no encontrado"));
        if (pedido.getEstado() == EstadoPedido.CERRADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El pedido ya está cerrado");
        }
        List<String> sinServir = pedido.getDetalles().stream()
                .filter(d -> d.getEstado() != EstadoPlatillo.SERVIDO && d.getEstado() != EstadoPlatillo.ANULADO)
                .map(d -> d.getProducto().getNombre() + " (" + d.getEstado() + ")")
                .toList();
        if (!sinServir.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Faltan servir o anular: " + String.join(", ", sinServir));
        }

        pedido.setEstado(EstadoPedido.CERRADO);
        pedido.getMesa().setEstado(Mesa.LIBRE);
        return CuentaResponse.from(pedidoRepository.saveAndFlush(pedido));
    }

    /**
     * HU-18 (CA-18): anula un platillo del pedido.
     * - PENDIENTE: no se cocinó nada; se anula sin merma (mozo o administrador, igual que con el PATCH de estado).
     * - EN_PREPARACION o LISTO: ya se usaron los insumos. Pide el motivo y registra como merma cada insumo RECETA de
     *   la receta (cantidad requerida x porciones), con MermaService: descuenta el stock y deja el movimiento MERMA.
     *   Lo pueden hacer el cocinero, el mozo o el administrador.
     * SERVIDO o ANULADO no se anulan (409). Si una merma falla, se deshace todo y el platillo sigue como estaba.
     */
    @Transactional
    public PedidoResponse anular(Long pedidoId, Long detalleId, AnularPlatilloRequest request,
                                 Authentication authentication) {
        Empleado empleado = empleadoActual.obtenerConRol(authentication, MOZO, COCINERO, ADMINISTRADOR);
        Long restauranteId = empleado.getRestaurante().getId();

        Pedido pedido = pedidoRepository.findWithLockByIdAndMesaRestauranteId(pedidoId, restauranteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido no encontrado"));
        PedidoDetalle detalle = pedido.getDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Platillo no encontrado"));
        if (pedido.getEstado() == EstadoPedido.CERRADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El pedido ya está cerrado");
        }

        EstadoPlatillo estado = detalle.getEstado();
        String rol = empleado.getRol().getNombre().toUpperCase();
        if (estado == EstadoPlatillo.SERVIDO || estado == EstadoPlatillo.ANULADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un platillo " + estado + " no se puede anular");
        }
        if (estado == EstadoPlatillo.PENDIENTE) {
            if (!TRANSICIONES.get(EstadoPlatillo.PENDIENTE).get(EstadoPlatillo.ANULADO).contains(rol)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Su rol no puede hacer este cambio");
            }
        } else {
            // Ya entró a cocina: lo usado es merma (motivo obligatorio, global o del restaurante)
            MotivoMerma motivo = mermaService.motivoDisponible(request == null ? null : request.motivoId(), empleado);
            registrarMerma(detalle, motivo, empleado);
        }

        detalle.setEstado(EstadoPlatillo.ANULADO);
        pedido.setEstado(estadoDelPedido(pedido.getDetalles(), pedido.getEstado()));
        return PedidoResponse.from(pedidoRepository.saveAndFlush(pedido));
    }

    // HU-18: lo mismo que descontaría al servir (HU-13), pero como merma
    private void registrarMerma(PedidoDetalle detalle, MotivoMerma motivo, Empleado empleado) {
        BigDecimal porciones = BigDecimal.valueOf(detalle.getCantidad());
        for (RecetaDetalle linea : recetaDetalleRepository.findByProductoIdOrderByIngredienteIdAsc(
                detalle.getProducto().getId())) {
            if (CONTROL_RECETA.equals(linea.getIngrediente().getTipoControl())) {
                mermaService.registrar(linea.getIngrediente(), linea.getCantidadRequerida().multiply(porciones),
                        motivo, empleado);
            }
        }
    }

    /**
     * HU-13 (CA-13): baja el stock de cada insumo de la receta, cantidad requerida x porciones, y deja su movimiento.
     * Si un insumo falla, se deshace todo, incluido el estado del platillo. El pedido ya está bloqueado y la
     * transición solo pasa una vez a SERVIDO, así que un platillo no descuenta dos veces.
     */
    private void descontarReceta(PedidoDetalle detalle, Empleado empleado) {
        Producto producto = detalle.getProducto();
        List<RecetaDetalle> receta = recetaDetalleRepository.findByProductoIdOrderByIngredienteIdAsc(producto.getId());
        if (receta.isEmpty() && Boolean.TRUE.equals(producto.getRequiereReceta())) {
            // Se sirve igual: la cocina no se frena por un dato faltante (Planning 3, punto 3), pero queda en el log
            log.warn("El producto {} requiere receta y no tiene: se sirvió sin descontar stock", producto.getId());
        }
        for (RecetaDetalle linea : receta) {
            if (!CONTROL_RECETA.equals(linea.getIngrediente().getTipoControl())) {
                continue;
            }
            BigDecimal cantidad = linea.getCantidadRequerida().multiply(BigDecimal.valueOf(detalle.getCantidad()));
            inventarioService.registrarConsumo(linea.getIngrediente().getId(), cantidad, detalle.getId(), empleado);
        }
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
