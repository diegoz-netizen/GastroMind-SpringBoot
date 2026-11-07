package com.gastromind.backendspring.service;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.Proveedor;
import com.gastromind.backendspring.entity.RegistroIngresoProveedor;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.repository.EmpleadoRepository;
import com.gastromind.backendspring.repository.RegistroIngresoProveedorRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * HU-16: a quién le llega el correo de alertas y qué dice. El correo se simula (no se conecta a ningún SMTP).
 * Que el aviso de stock salga solo después del commit lo da @TransactionalEventListener; aquí se llama directo.
 */
@DataJpaTest
@ActiveProfiles("test")
class AlertaServiceTest {

    private static final LocalDate HOY = LocalDate.of(2026, 11, 3);

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private RegistroIngresoProveedorRepository registroIngresoRepository;

    private final CorreoService correoService = mock(CorreoService.class);
    private AlertaService alertaService;

    private Restaurante central;
    private Restaurante norte;
    private Empleado almaceneroCentral;
    private Proveedor proveedor;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(HOY.atStartOfDay(ZoneId.of("America/Lima")).toInstant(), ZoneId.of("America/Lima"));
        alertaService = new AlertaService(empleadoRepository, registroIngresoRepository, correoService, clock);

        central = Restaurante.builder().nombre("Sede Central").build();
        norte = Restaurante.builder().nombre("Sede Norte").build();
        entityManager.persist(central);
        entityManager.persist(norte);
        Rol admin = rol("ADMINISTRADOR");
        Rol almacen = rol("ALMACENERO");
        Rol cocina = rol("COCINERO");

        empleado(central, admin, "Ana Admin", "admin@central.com", "ACTIVO");
        almaceneroCentral = empleado(central, almacen, "Luis Almacén", "almacen@central.com", "ACTIVO");
        empleado(central, almacen, "Inés Inactiva", "inactiva@central.com", "INACTIVO");
        empleado(central, cocina, "Carlos Cocina", "cocina@central.com", "ACTIVO");
        empleado(norte, admin, "Nora Norte", "admin@norte.com", "ACTIVO");

        proveedor = Proveedor.builder().restaurante(central).nombre("Mercado Central").build();
        entityManager.persist(proveedor);
        entityManager.flush();
    }

    private Rol rol(String nombre) {
        Rol rol = Rol.builder().nombre(nombre).build();
        entityManager.persist(rol);
        return rol;
    }

    private Empleado empleado(Restaurante restaurante, Rol rol, String nombre, String correo, String estado) {
        Empleado empleado = Empleado.builder().restaurante(restaurante).rol(rol).nombreCompleto(nombre)
                .correo(correo).passwordHash("hash").estado(estado).build();
        entityManager.persist(empleado);
        return empleado;
    }

    private void lote(Restaurante restaurante, String insumo, String stock, String lote, LocalDate vence) {
        Ingrediente ingrediente = Ingrediente.builder().restaurante(restaurante).nombre(insumo).unidadMedida("kg")
                .stockActual(new BigDecimal(stock)).costoUnitario(new BigDecimal("2.00")).build();
        entityManager.persist(ingrediente);
        entityManager.persist(RegistroIngresoProveedor.builder().empleado(almaceneroCentral).proveedor(proveedor)
                .ingrediente(ingrediente).lote(lote).fechaVencimiento(vence).cantidadRecibida(new BigDecimal("1"))
                .costoTotal(new BigDecimal("2.00")).build());
        entityManager.flush();
    }

    private List<String> correosEnviados(int veces, ArgumentCaptor<String> asunto, ArgumentCaptor<String> cuerpo) {
        ArgumentCaptor<String> para = ArgumentCaptor.forClass(String.class);
        verify(correoService, times(veces)).enviar(para.capture(), asunto.capture(), cuerpo.capture());
        return para.getAllValues();
    }

    @Test
    void stockMinimo_LeLlegaAlAdminYAlAlmaceneroActivosDelRestaurante() {
        alertaService.avisarStockMinimo(new AlertaStockMinimo(central.getId(), "Tomate", "kg",
                new BigDecimal("4.500"), new BigDecimal("5.000")));

        ArgumentCaptor<String> asunto = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> cuerpo = ArgumentCaptor.forClass(String.class);
        List<String> para = correosEnviados(2, asunto, cuerpo);

        // Ni el inactivo, ni cocina, ni el admin de otra sede
        assertEquals(List.of("admin@central.com", "almacen@central.com"), para.stream().sorted().toList());
        assertEquals("GastroMind · Stock mínimo: Tomate", asunto.getValue());
        assertTrue(cuerpo.getValue().contains("El insumo Tomate llegó a su stock mínimo."));
        assertTrue(cuerpo.getValue().contains("Stock actual: 4.5 kg"));
        assertTrue(cuerpo.getValue().contains("Stock mínimo: 5 kg"));
    }

    @Test
    void vencimientos_AvisaLosLotesDeTresDiasOMenosYLosVencidosConStock() {
        lote(central, "Pescado", "2.000", "P-01", HOY.minusDays(1));
        lote(central, "Leche", "6.000", "L-07", HOY.plusDays(2));
        lote(central, "Pollo", "3.000", null, HOY);
        lote(central, "Queso", "0.000", "Q-02", HOY.plusDays(1));   // sin stock: no se avisa
        lote(central, "Arroz", "25.000", "A-03", HOY.plusDays(4));  // falta más de 3 días

        alertaService.avisarVencimientos();

        ArgumentCaptor<String> asunto = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> cuerpo = ArgumentCaptor.forClass(String.class);
        List<String> para = correosEnviados(2, asunto, cuerpo);

        assertEquals(List.of("admin@central.com", "almacen@central.com"), para.stream().sorted().toList());
        assertEquals("GastroMind · Insumos por vencer (03/11/2026)", asunto.getValue());
        String texto = cuerpo.getValue();
        assertTrue(texto.contains("Estos lotes están vencidos o vencen en 3 días o menos:"));
        assertTrue(texto.contains("- Pescado (lote P-01): venció el 02/11/2026"));
        assertTrue(texto.contains("- Pollo: vence hoy"));
        assertTrue(texto.contains("- Leche (lote L-07): vence el 05/11/2026 (en 2 días)"));
        assertFalse(texto.contains("Queso"));
        assertFalse(texto.contains("Arroz"));
        // Del más urgente al menos urgente
        assertTrue(texto.indexOf("Pescado") < texto.indexOf("Pollo") && texto.indexOf("Pollo") < texto.indexOf("Leche"));
    }

    @Test
    void vencimientos_DeNocheEnLima_UsanLaFechaDeLimaAunqueLaAppCorraEnUtc() {
        // 3/11 a las 20:02 en Lima = 4/11 01:02 en UTC (la zona de la app)
        Clock relojUtc = Clock.fixed(Instant.parse("2026-11-04T01:02:00Z"), ZoneOffset.UTC);
        alertaService = new AlertaService(empleadoRepository, registroIngresoRepository, correoService, relojUtc);
        lote(central, "Pollo", "3.000", "AV-01", HOY.plusDays(3));
        lote(central, "Tomate", "1.000", "MM-01", HOY);

        alertaService.avisarVencimientos();

        ArgumentCaptor<String> asunto = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> cuerpo = ArgumentCaptor.forClass(String.class);
        correosEnviados(2, asunto, cuerpo);
        assertEquals("GastroMind · Insumos por vencer (03/11/2026)", asunto.getValue());
        assertTrue(cuerpo.getValue().contains("- Tomate (lote MM-01): vence hoy"));
        assertTrue(cuerpo.getValue().contains("- Pollo (lote AV-01): vence el 06/11/2026 (en 3 días)"));
    }

    @Test
    void sinLotesPorVencer_NoSaleNingunCorreo() {
        lote(central, "Arroz", "25.000", "A-03", HOY.plusDays(10));

        alertaService.avisarVencimientos();

        verifyNoInteractions(correoService);
    }
}
