package com.gastromind.backendspring.service;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.RegistroIngresoProveedor;
import com.gastromind.backendspring.repository.EmpleadoRepository;
import com.gastromind.backendspring.repository.RegistroIngresoProveedorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * HU-16: avisos por correo al administrador y a los almaceneros activos del restaurante.
 * - Stock mínimo: al instante, cuando InventarioService deja un insumo en su mínimo (solo si la operación se guardó).
 * - Vencimiento: una revisión al día con los lotes que vencen en 3 días o menos, o ya vencidos con stock
 *   (mismo criterio que GET /api/catalogo/alertas/ de Django).
 * La pantalla (tarjeta "Alertas de hoy") ya existe en la web; esto es el aviso que le llega a quien no la tiene abierta.
 */
@Service
public class AlertaService {

    static final List<String> ROLES_AVISADOS = List.of("ADMINISTRADOR", "ALMACENERO");
    static final int DIAS_AVISO_VENCIMIENTO = 3;
    // La app corre en UTC (BackendSpringApplication), pero el "hoy" de los vencimientos es el de Lima
    static final String ZONA_LIMA = "America/Lima";
    private static final ZoneId LIMA = ZoneId.of(ZONA_LIMA);
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String PIE = "\n\nRevisa la tarjeta \"Alertas de hoy\" en el Panel de GastroMind."
            + "\n\nEste es un correo automático, no respondas a este mensaje.";

    private final EmpleadoRepository empleadoRepository;
    private final RegistroIngresoProveedorRepository registroIngresoRepository;
    private final CorreoService correoService;
    private final Clock clock;

    @Autowired
    public AlertaService(EmpleadoRepository empleadoRepository,
                         RegistroIngresoProveedorRepository registroIngresoRepository,
                         CorreoService correoService) {
        this(empleadoRepository, registroIngresoRepository, correoService, Clock.system(LIMA));
    }

    // Para los tests: fija el "hoy" de la revisión de vencimientos
    AlertaService(EmpleadoRepository empleadoRepository, RegistroIngresoProveedorRepository registroIngresoRepository,
                  CorreoService correoService, Clock clock) {
        this.empleadoRepository = empleadoRepository;
        this.registroIngresoRepository = registroIngresoRepository;
        this.correoService = correoService;
        this.clock = clock;
    }

    /** Corre después del commit: si el pedido o la compra fallan, no sale ningún correo. */
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void avisarStockMinimo(AlertaStockMinimo alerta) {
        String asunto = "GastroMind · Stock mínimo: " + alerta.insumo();
        String detalle = "El insumo " + alerta.insumo() + " llegó a su stock mínimo."
                + "\nStock actual: " + cantidad(alerta.stockActual(), alerta.unidad())
                + "\nStock mínimo: " + cantidad(alerta.stockMinimo(), alerta.unidad());
        for (Empleado destinatario : destinatarios(alerta.restauranteId())) {
            correoService.enviar(destinatario.getCorreo(), asunto, saludo(destinatario) + detalle + PIE);
        }
    }

    /** Todos los días a las 7:00 (hora de Lima); la hora se cambia con ALERTAS_VENCIMIENTO_CRON. */
    @Scheduled(cron = "${gastromind.alertas.vencimiento-cron}", zone = ZONA_LIMA)
    @Transactional(readOnly = true)
    public void avisarVencimientos() {
        LocalDate hoy = LocalDate.now(clock.withZone(LIMA));
        Map<Long, List<RegistroIngresoProveedor>> porRestaurante = registroIngresoRepository
                .findByFechaVencimientoLessThanEqualAndIngredienteStockActualGreaterThanOrderByFechaVencimientoAscIdAsc(
                        hoy.plusDays(DIAS_AVISO_VENCIMIENTO), BigDecimal.ZERO)
                .stream()
                .collect(Collectors.groupingBy(lote -> lote.getIngrediente().getRestaurante().getId(),
                        LinkedHashMap::new, Collectors.toList()));

        porRestaurante.forEach((restauranteId, lotes) -> {
            String asunto = "GastroMind · Insumos por vencer (" + hoy.format(FECHA) + ")";
            String detalle = lotes.stream().map(lote -> lineaDeLote(lote, hoy))
                    .collect(Collectors.joining("\n", "Estos lotes están vencidos o vencen en "
                            + DIAS_AVISO_VENCIMIENTO + " días o menos:\n", ""));
            for (Empleado destinatario : destinatarios(restauranteId)) {
                correoService.enviar(destinatario.getCorreo(), asunto, saludo(destinatario) + detalle + PIE);
            }
        });
    }

    private List<Empleado> destinatarios(Long restauranteId) {
        return empleadoRepository.findByRestauranteIdAndRolNombreInAndEstado(restauranteId, ROLES_AVISADOS, "ACTIVO");
    }

    private static String lineaDeLote(RegistroIngresoProveedor lote, LocalDate hoy) {
        long dias = ChronoUnit.DAYS.between(hoy, lote.getFechaVencimiento());
        String cuando;
        if (dias < 0) {
            cuando = "venció el " + lote.getFechaVencimiento().format(FECHA);
        } else if (dias == 0) {
            cuando = "vence hoy";
        } else {
            cuando = "vence el " + lote.getFechaVencimiento().format(FECHA)
                    + (dias == 1 ? " (mañana)" : " (en " + dias + " días)");
        }
        String nombreLote = lote.getLote() == null || lote.getLote().isBlank() ? "" : " (lote " + lote.getLote() + ")";
        return "- " + lote.getIngrediente().getNombre() + nombreLote + ": " + cuando;
    }

    private static String saludo(Empleado empleado) {
        return "Hola, " + empleado.getNombreCompleto() + ":\n\n";
    }

    private static String cantidad(BigDecimal valor, String unidad) {
        return valor.stripTrailingZeros().toPlainString() + " " + unidad;
    }
}
