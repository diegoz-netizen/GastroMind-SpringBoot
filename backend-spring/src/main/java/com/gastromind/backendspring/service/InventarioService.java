package com.gastromind.backendspring.service;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.MovimientoInventario;
import com.gastromind.backendspring.entity.RegistroIngresoProveedor;
import com.gastromind.backendspring.entity.TipoMovimiento;
import com.gastromind.backendspring.repository.IngredienteRepository;
import com.gastromind.backendspring.repository.MovimientoInventarioRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * Base del Sprint 3: el ÚNICO lugar que cambia ingrediente.stock_actual.
 * La HU-13 (consumo al servir), la HU-14 (ingreso de compras) y las mermas (HU-17 y HU-18) llaman aquí;
 * nadie más actualiza el stock por su cuenta.
 *
 * Cada llamada, en una sola transacción:
 * 1. bloquea la fila del insumo (SELECT ... FOR UPDATE), así dos pedidos a la vez no pisan el saldo;
 * 2. suma o resta la cantidad a stock_actual;
 * 3. guarda el movimiento con el saldo que quedó (la columna Saldo del kardex).
 * Si algo falla, no se guarda ni el stock ni el movimiento.
 *
 * Las cantidades llegan siempre positivas (lo que entró o salió); el signo lo pone el tipo.
 * Para el consumo y las mermas, quien llama debe pasar el insumo de su propio origen (el insumo de la receta
 * de ese platillo, el de esa merma); cuando existan sus entidades, conviene una sobrecarga como la del ingreso.
 * El restaurante sale del empleado que hace la operación, nunca del cliente.
 */
@Service
public class InventarioService {

    // Misma escala que receta_detalle.cantidad_requerida y stock_actual (DECIMAL(10,3), migración 005)
    static final int ESCALA = 3;
    private static final BigDecimal MAXIMO = new BigDecimal("9999999.999");

    private final IngredienteRepository ingredienteRepository;
    private final MovimientoInventarioRepository movimientoRepository;
    private final EntityManager entityManager;

    public InventarioService(IngredienteRepository ingredienteRepository,
                             MovimientoInventarioRepository movimientoRepository,
                             EntityManager entityManager) {
        this.ingredienteRepository = ingredienteRepository;
        this.movimientoRepository = movimientoRepository;
        this.entityManager = entityManager;
    }

    /** HU-14: una compra recibida suma su cantidad al stock. */
    @Transactional
    public MovimientoInventario registrarIngreso(Long ingredienteId, BigDecimal cantidad,
                                                 Long registroIngresoId, Empleado empleado) {
        return registrar(ingredienteId, TipoMovimiento.INGRESO, cantidad, registroIngresoId, empleado);
    }

    /**
     * HU-14: igual que el anterior, pero el insumo y la cantidad salen de la misma compra,
     * así el movimiento no puede quedar apuntando a una compra de otro insumo (observación 2 del #32).
     */
    @Transactional
    public MovimientoInventario registrarIngreso(RegistroIngresoProveedor compra, Empleado empleado) {
        Objects.requireNonNull(compra, "compra");
        return registrar(compra.getIngrediente().getId(), TipoMovimiento.INGRESO, compra.getCantidadRecibida(),
                compra.getId(), empleado);
    }

    /** HU-13: un platillo servido descuenta, por cada insumo de su receta, cantidad requerida x porciones. */
    @Transactional
    public MovimientoInventario registrarConsumo(Long ingredienteId, BigDecimal cantidad,
                                                 Long pedidoDetalleId, Empleado empleado) {
        return registrar(ingredienteId, TipoMovimiento.CONSUMO, cantidad, pedidoDetalleId, empleado);
    }

    /** HU-17 y HU-18: una merma registrada descuenta su cantidad. */
    @Transactional
    public MovimientoInventario registrarMerma(Long ingredienteId, BigDecimal cantidad,
                                               Long registroMermaId, Empleado empleado) {
        return registrar(ingredienteId, TipoMovimiento.MERMA, cantidad, registroMermaId, empleado);
    }

    private MovimientoInventario registrar(Long ingredienteId, TipoMovimiento tipo, BigDecimal cantidad,
                                           Long origenId, Empleado empleado) {
        Objects.requireNonNull(ingredienteId, "ingredienteId");
        Objects.requireNonNull(origenId, "el movimiento necesita su origen (pedido, compra o merma)");
        Objects.requireNonNull(empleado, "empleado");
        BigDecimal valor = validarCantidad(cantidad);
        Long restauranteId = empleado.getRestaurante().getId();

        // Un insumo de otro restaurante se trata como inexistente (no se revela que existe)
        Ingrediente insumo = ingredienteRepository.findByIdAndRestauranteId(ingredienteId, restauranteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insumo no encontrado"));
        // flush: guarda antes lo que el llamador ya cambió en esta transacción (p. ej. el costo de la HU-14),
        // porque el refresh lo descartaría. refresh con bloqueo: relee el stock de la BD aunque el insumo
        // ya estuviera cargado, y deja la fila bloqueada hasta el final de la transacción.
        entityManager.flush();
        entityManager.refresh(insumo, LockModeType.PESSIMISTIC_WRITE);

        // Se revisa con la fila ya bloqueada: si otra transacción registró lo mismo, aquí ya se ve
        if (yaRegistrado(tipo, origenId, ingredienteId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, mensajeDuplicado(tipo));
        }

        BigDecimal delta = tipo == TipoMovimiento.INGRESO ? valor : valor.negate();
        // Planning 3, punto 3 (decide el PO): por ahora el stock puede quedar negativo y lo avisa la alerta
        // de la HU-16. Si se decide bloquear, va aquí: saldo < 0 en CONSUMO o MERMA -> 409.
        BigDecimal saldo = insumo.getStockActual().add(delta).setScale(ESCALA);
        if (saldo.abs().compareTo(MAXIMO) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El stock resultante supera el máximo permitido (9 999 999,999)");
        }

        insumo.setStockActual(saldo);
        return movimientoRepository.save(MovimientoInventario.builder()
                .ingrediente(insumo)
                .tipo(tipo)
                .cantidad(delta.setScale(ESCALA))
                .saldo(saldo)
                .empleado(empleado)
                .pedidoDetalleId(tipo == TipoMovimiento.CONSUMO ? origenId : null)
                .registroIngresoId(tipo == TipoMovimiento.INGRESO ? origenId : null)
                .registroMermaId(tipo == TipoMovimiento.MERMA ? origenId : null)
                .build());
    }

    private static BigDecimal validarCantidad(BigDecimal cantidad) {
        if (cantidad == null || cantidad.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser mayor que 0");
        }
        // No se redondea a escondidas: con más de 3 decimales el stock dejaría de cuadrar con lo que pasó
        if (cantidad.stripTrailingZeros().scale() > ESCALA) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad admite hasta 3 decimales");
        }
        return cantidad;
    }

    private boolean yaRegistrado(TipoMovimiento tipo, Long origenId, Long ingredienteId) {
        return switch (tipo) {
            case CONSUMO -> movimientoRepository.existsByPedidoDetalleIdAndIngredienteId(origenId, ingredienteId);
            case INGRESO -> movimientoRepository.existsByRegistroIngresoId(origenId);
            case MERMA -> movimientoRepository.existsByRegistroMermaId(origenId);
            case AJUSTE -> false;
        };
    }

    private static String mensajeDuplicado(TipoMovimiento tipo) {
        return switch (tipo) {
            case CONSUMO -> "Este platillo ya descontó ese insumo";
            case INGRESO -> "Esta compra ya se sumó al stock";
            case MERMA -> "Esta merma ya se descontó del stock";
            case AJUSTE -> "Movimiento repetido";
        };
    }
}
