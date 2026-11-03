package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.CompraOpcionesResponse;
import com.gastromind.backendspring.dto.IngresoCompraRequest;
import com.gastromind.backendspring.dto.IngresoCompraResponse;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.MovimientoInventario;
import com.gastromind.backendspring.entity.Proveedor;
import com.gastromind.backendspring.entity.RegistroIngresoProveedor;
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
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * HU-14 (CA-21): la compra se guarda y sube el stock con InventarioService, con su movimiento y su saldo.
 * Corre contra H2 (perfil test).
 */
@DataJpaTest
@ActiveProfiles("test")
@Import({CompraService.class, InventarioService.class, EmpleadoActual.class})
class CompraServiceTest {

    @Autowired
    private CompraService compraService;

    @Autowired
    private MovimientoInventarioRepository movimientoRepository;

    @Autowired
    private EntityManager entityManager;

    private Restaurante central;
    private Empleado almacenero;
    private Empleado admin;
    private Empleado cocinero;
    private Proveedor proveedor;
    private Proveedor proveedorNorte;
    private Ingrediente arroz;
    private Ingrediente arrozNorte;

    @BeforeEach
    void setUp() {
        central = Restaurante.builder().nombre("Sede Central").build();
        Restaurante norte = Restaurante.builder().nombre("Sede Norte").build();
        entityManager.persist(central);
        entityManager.persist(norte);
        almacenero = empleado(central, rol("ALMACENERO"), "almacen@test.com");
        admin = empleado(central, rol("ADMINISTRADOR"), "admin@test.com");
        cocinero = empleado(central, rol("COCINERO"), "cocina@test.com");
        proveedor = proveedor(central, "Mayorista Lima");
        proveedorNorte = proveedor(norte, "Mayorista Norte");
        arroz = insumo(central, "Arroz", "2.000");
        arrozNorte = insumo(norte, "Arroz", "0.000");
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

    private Proveedor proveedor(Restaurante restaurante, String nombre) {
        Proveedor nuevo = Proveedor.builder().restaurante(restaurante).nombre(nombre).build();
        entityManager.persist(nuevo);
        return nuevo;
    }

    private Ingrediente insumo(Restaurante restaurante, String nombre, String stock) {
        Ingrediente ingrediente = Ingrediente.builder().restaurante(restaurante).nombre(nombre).unidadMedida("kg")
                .stockActual(new BigDecimal(stock)).costoUnitario(new BigDecimal("4.50")).build();
        entityManager.persist(ingrediente);
        return ingrediente;
    }

    private static Authentication como(Empleado empleado) {
        return new UsernamePasswordAuthenticationToken(empleado.getId(), null, List.of());
    }

    private IngresoCompraRequest compra(Long proveedorId, Long ingredienteId, String cantidad,
                                        String lote, LocalDate vence) {
        return new IngresoCompraRequest(proveedorId, ingredienteId, new BigDecimal(cantidad),
                new BigDecimal("125.50"), lote, vence);
    }

    private IngresoCompraRequest compraDeArroz(String cantidad) {
        return compra(proveedor.getId(), arroz.getId(), cantidad, "L-001", LocalDate.now().plusDays(30));
    }

    private static void assertStatus(HttpStatus esperado, Runnable accion) {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, accion::run);
        assertEquals(esperado, ex.getStatusCode());
    }

    /** Lee el insumo desde la BD, no desde la entidad en memoria. */
    private Ingrediente insumoGuardado(Ingrediente ingrediente) {
        entityManager.flush();
        entityManager.clear();
        return entityManager.find(Ingrediente.class, ingrediente.getId());
    }

    @Test
    void registrar_GuardaLaCompra_SubeElStock_YDejaSuMovimiento() {
        IngresoCompraResponse respuesta = compraService.registrar(compraDeArroz("10.5"), como(almacenero));

        assertNotNull(respuesta.getId());
        assertEquals(new BigDecimal("10.500"), respuesta.getCantidad());
        assertEquals(new BigDecimal("125.50"), respuesta.getCostoTotal());
        assertEquals(new BigDecimal("12.500"), respuesta.getStockResultante());
        assertEquals("Mayorista Lima", respuesta.getProveedor());
        assertEquals("almacen@test.com", respuesta.getRegistradoPor());
        assertEquals(new BigDecimal("12.500"), insumoGuardado(arroz).getStockActual());

        List<MovimientoInventario> kardex = movimientoRepository.findByIngredienteIdOrderByFechaAscIdAsc(arroz.getId());
        assertEquals(1, kardex.size());
        assertEquals(TipoMovimiento.INGRESO, kardex.get(0).getTipo());
        assertEquals(respuesta.getId(), kardex.get(0).getRegistroIngresoId());
        assertEquals(new BigDecimal("12.500"), kardex.get(0).getSaldo());
    }

    @Test
    void registrar_NoCambiaElCostoUnitarioDelInsumo() {
        // Decisión del 28/10: el costo de la compra queda en costo_total; el costo promedio es de la HU-22
        compraService.registrar(compraDeArroz("10"), como(almacenero));

        assertEquals(0, new BigDecimal("4.50").compareTo(insumoGuardado(arroz).getCostoUnitario()));
    }

    @Test
    void registrar_ElAdministradorTambienPuede() {
        IngresoCompraResponse respuesta = compraService.registrar(compraDeArroz("1"), como(admin));

        assertEquals(new BigDecimal("3.000"), respuesta.getStockResultante());
    }

    @Test
    void registrar_OtroRol_Responde403_YNoMueveElStock() {
        assertStatus(HttpStatus.FORBIDDEN, () -> compraService.registrar(compraDeArroz("1"), como(cocinero)));

        assertEquals(new BigDecimal("2.000"), insumoGuardado(arroz).getStockActual());
    }

    @Test
    void registrar_ProveedorOInsumoDeOtroRestaurante_Responde404() {
        assertStatus(HttpStatus.NOT_FOUND, () -> compraService.registrar(
                compra(proveedorNorte.getId(), arroz.getId(), "1", null, null), como(almacenero)));
        assertStatus(HttpStatus.NOT_FOUND, () -> compraService.registrar(
                compra(proveedor.getId(), arrozNorte.getId(), "1", null, null), como(almacenero)));

        assertEquals(new BigDecimal("0.000"), insumoGuardado(arrozNorte).getStockActual());
        assertTrue(movimientoRepository.findByIngredienteIdOrderByFechaAscIdAsc(arroz.getId()).isEmpty());
    }

    @Test
    void registrar_LoteVencido_Responde400_PeroElQueVenceHoyEntra() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> compraService.registrar(
                compra(proveedor.getId(), arroz.getId(), "1", "L-1", LocalDate.now().minusDays(1)), como(almacenero)));

        IngresoCompraResponse hoy = compraService.registrar(
                compra(proveedor.getId(), arroz.getId(), "1", "L-2", LocalDate.now()), como(almacenero));
        assertEquals(LocalDate.now(), hoy.getFechaVencimiento());
    }

    @Test
    void registrar_LoteEnBlanco_SeGuardaComoNull() {
        IngresoCompraResponse respuesta = compraService.registrar(
                compra(proveedor.getId(), arroz.getId(), "1", "   ", null), como(almacenero));

        assertNull(respuesta.getLote());
        assertNull(entityManager.find(RegistroIngresoProveedor.class, respuesta.getId()).getLote());
    }

    @Test
    void listar_DevuelveLasComprasDelRestaurante_SinStockResultante() {
        compraService.registrar(compraDeArroz("1"), como(almacenero));
        compraService.registrar(compraDeArroz("2"), como(admin));

        List<IngresoCompraResponse> compras = compraService.listar(como(almacenero));

        assertEquals(2, compras.size());
        // El stock pudo moverse después de cada compra: en el listado no se informa
        assertTrue(compras.stream().allMatch(c -> c.getStockResultante() == null));
    }

    @Test
    void opciones_SoloTraeProveedoresEInsumosDelRestaurante() {
        CompraOpcionesResponse opciones = compraService.opciones(como(almacenero));

        assertEquals(List.of(proveedor.getId()),
                opciones.proveedores().stream().map(CompraOpcionesResponse.ProveedorOpcion::id).toList());
        assertEquals(List.of(arroz.getId()),
                opciones.insumos().stream().map(CompraOpcionesResponse.InsumoOpcion::id).toList());
    }
}
