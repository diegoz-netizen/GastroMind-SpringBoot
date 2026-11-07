package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.MermaRequest;
import com.gastromind.backendspring.dto.MermaResponse;
import com.gastromind.backendspring.dto.MotivoMermaResponse;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.MotivoMerma;
import com.gastromind.backendspring.entity.MovimientoInventario;
import com.gastromind.backendspring.entity.RegistroMerma;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.entity.TipoMovimiento;
import com.gastromind.backendspring.repository.MovimientoInventarioRepository;
import com.gastromind.backendspring.security.EmpleadoActual;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * HU-17 (CA-17): la merma se guarda con su motivo y responsable, y descuenta el stock con InventarioService.
 * Corre contra H2 (perfil test).
 */
@DataJpaTest
@ActiveProfiles("test")
@Import({MermaService.class, InventarioService.class, EmpleadoActual.class})
class MermaServiceTest {

    @Autowired
    private MermaService mermaService;

    @Autowired
    private MovimientoInventarioRepository movimientoRepository;

    @Autowired
    private EntityManager entityManager;

    private Empleado almacenero;
    private Empleado cocinero;
    private Empleado mozo;
    private Ingrediente arroz;
    private Ingrediente arrozNorte;
    private MotivoMerma vencido;
    private MotivoMerma propioCentral;
    private MotivoMerma propioNorte;

    @BeforeEach
    void setUp() {
        Restaurante central = Restaurante.builder().nombre("Sede Central").build();
        Restaurante norte = Restaurante.builder().nombre("Sede Norte").build();
        entityManager.persist(central);
        entityManager.persist(norte);
        almacenero = empleado(central, rol("ALMACENERO"), "almacen@test.com");
        cocinero = empleado(central, rol("COCINERO"), "cocina@test.com");
        mozo = empleado(central, rol("MOZO"), "mozo@test.com");
        arroz = insumo(central, "10.000");
        arrozNorte = insumo(norte, "5.000");
        vencido = motivo(null, "VENCIDO", true);
        propioCentral = motivo(central, "CAIDA_AL_PISO", false);
        propioNorte = motivo(norte, "SOLO_NORTE", false);
        entityManager.flush();
    }

    private Rol rol(String nombre) {
        Rol rol = Rol.builder().nombre(nombre).build();
        entityManager.persist(rol);
        return rol;
    }

    private Empleado empleado(Restaurante restaurante, Rol rol, String correo) {
        Empleado empleado = Empleado.builder().restaurante(restaurante).rol(rol).nombreCompleto(correo)
                .correo(correo).passwordHash("hash").build();
        entityManager.persist(empleado);
        return empleado;
    }

    private Ingrediente insumo(Restaurante restaurante, String stock) {
        Ingrediente ingrediente = Ingrediente.builder().restaurante(restaurante).nombre("Arroz").unidadMedida("kg")
                .stockActual(new BigDecimal(stock)).costoUnitario(new BigDecimal("4.50")).build();
        entityManager.persist(ingrediente);
        return ingrediente;
    }

    private MotivoMerma motivo(Restaurante restaurante, String nombre, boolean global) {
        MotivoMerma motivo = MotivoMerma.builder().restaurante(restaurante).nombre(nombre).esGlobal(global).build();
        entityManager.persist(motivo);
        return motivo;
    }

    private static Authentication como(Empleado empleado) {
        return new UsernamePasswordAuthenticationToken(empleado.getId(), null, List.of());
    }

    private MermaRequest merma(Long ingredienteId, String cantidad, Long motivoId) {
        return new MermaRequest(ingredienteId, new BigDecimal(cantidad), motivoId);
    }

    private static void assertStatus(HttpStatus esperado, Runnable accion) {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, accion::run);
        assertEquals(esperado, ex.getStatusCode());
    }

    /** Lee el insumo desde la BD, no desde la entidad en memoria. */
    private BigDecimal stockGuardado(Ingrediente ingrediente) {
        entityManager.flush();
        entityManager.clear();
        return entityManager.find(Ingrediente.class, ingrediente.getId()).getStockActual();
    }

    @Test
    void registrar_GuardaLaMerma_BajaElStock_YDejaSuMovimiento() {
        MermaResponse respuesta = mermaService.registrar(merma(arroz.getId(), "1.5", vencido.getId()), como(almacenero));

        assertNotNull(respuesta.id());
        assertEquals(new BigDecimal("1.500"), respuesta.cantidad());
        assertEquals("VENCIDO", respuesta.motivo());
        assertEquals(new BigDecimal("8.500"), respuesta.stockDespues());
        assertEquals(new BigDecimal("6.75"), respuesta.costo());
        assertEquals("almacen@test.com", respuesta.registradoPor());
        assertEquals(new BigDecimal("8.500"), stockGuardado(arroz));

        RegistroMerma guardada = entityManager.find(RegistroMerma.class, respuesta.id());
        assertEquals(almacenero.getId(), guardada.getEmpleado().getId());
        assertEquals(vencido.getId(), guardada.getMotivo().getId());

        List<MovimientoInventario> kardex = movimientoRepository.findByIngredienteIdOrderByFechaAscIdAsc(arroz.getId());
        assertEquals(1, kardex.size());
        assertEquals(TipoMovimiento.MERMA, kardex.get(0).getTipo());
        assertEquals(new BigDecimal("-1.500"), kardex.get(0).getCantidad());
        assertEquals(respuesta.id(), kardex.get(0).getRegistroMermaId());
    }

    @Test
    void registrar_ElCocineroTambienPuede_ConUnMotivoPropioDelRestaurante() {
        MermaResponse respuesta = mermaService.registrar(merma(arroz.getId(), "2", propioCentral.getId()), como(cocinero));

        assertEquals("CAIDA_AL_PISO", respuesta.motivo());
        assertEquals(new BigDecimal("8.000"), respuesta.stockDespues());
    }

    @Test
    void registrar_OtroRol_Responde403_YNoMueveElStock() {
        assertStatus(HttpStatus.FORBIDDEN,
                () -> mermaService.registrar(merma(arroz.getId(), "1", vencido.getId()), como(mozo)));

        assertEquals(new BigDecimal("10.000"), stockGuardado(arroz));
    }

    @Test
    void registrar_InsumoDeOtroRestaurante_Responde404() {
        assertStatus(HttpStatus.NOT_FOUND,
                () -> mermaService.registrar(merma(arrozNorte.getId(), "1", vencido.getId()), como(almacenero)));

        assertEquals(new BigDecimal("5.000"), stockGuardado(arrozNorte));
    }

    @Test
    void registrar_MotivoInexistenteODeOtroRestaurante_Responde400() {
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> mermaService.registrar(merma(arroz.getId(), "1", 999_999L), como(almacenero)));
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> mermaService.registrar(merma(arroz.getId(), "1", propioNorte.getId()), como(almacenero)));

        assertEquals(new BigDecimal("10.000"), stockGuardado(arroz));
        assertTrue(movimientoRepository.findByIngredienteIdOrderByFechaAscIdAsc(arroz.getId()).isEmpty());
    }

    @Test
    void registrar_CantidadConCuatroDecimales_Responde400() {
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> mermaService.registrar(merma(arroz.getId(), "0.0005", vencido.getId()), como(almacenero)));
    }

    @Test
    void motivos_TraeLosGlobalesYLosDelRestaurante_NoLosDeOtro() {
        List<String> nombres = mermaService.motivos(como(cocinero)).stream().map(MotivoMermaResponse::nombre).toList();

        assertEquals(List.of("VENCIDO", "CAIDA_AL_PISO"), nombres);
    }
}
