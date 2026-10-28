package com.gastromind.backendspring.service;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.MovimientoInventario;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.entity.TipoMovimiento;
import com.gastromind.backendspring.repository.MovimientoInventarioRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Base del Sprint 3: InventarioService es el único que mueve el stock y cada movimiento guarda el saldo que quedó.
 * Corre contra H2 (perfil test); el esquema real y sus CHECK los prueba el job "esquema" del CI.
 */
@DataJpaTest
@ActiveProfiles("test")
@Import(InventarioService.class)
class InventarioServiceTest {

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private MovimientoInventarioRepository movimientoRepository;

    @Autowired
    private EntityManager entityManager;

    private Restaurante norte;
    private Empleado almacenero;
    private Ingrediente sal;

    @BeforeEach
    void setUp() {
        Restaurante central = Restaurante.builder().nombre("Sede Central").build();
        norte = Restaurante.builder().nombre("Sede Norte").build();
        entityManager.persist(central);
        entityManager.persist(norte);
        Rol rol = Rol.builder().nombre("ALMACENERO").build();
        entityManager.persist(rol);
        almacenero = Empleado.builder().restaurante(central).rol(rol).nombreCompleto("Almacenero Central")
                .correo("almacen@test.com").passwordHash("hash").build();
        entityManager.persist(almacenero);
        sal = insumo(central, "Sal", "2.000");
        entityManager.flush();
    }

    private Ingrediente insumo(Restaurante restaurante, String nombre, String stock) {
        Ingrediente ingrediente = Ingrediente.builder().restaurante(restaurante).nombre(nombre).unidadMedida("kg")
                .stockActual(new BigDecimal(stock)).costoUnitario(new BigDecimal("1.50")).build();
        entityManager.persist(ingrediente);
        return ingrediente;
    }

    /** Lee el stock desde la BD, no desde la entidad en memoria. */
    private BigDecimal stockGuardado(Ingrediente ingrediente) {
        entityManager.flush();
        entityManager.clear();
        return entityManager.find(Ingrediente.class, ingrediente.getId()).getStockActual();
    }

    private static BigDecimal kg(String valor) {
        return new BigDecimal(valor);
    }

    @Test
    void ingreso_SumaAlStockYGuardaElMovimientoConSuSaldo() {
        MovimientoInventario mov = inventarioService.registrarIngreso(sal.getId(), kg("5"), 10L, almacenero);

        assertEquals(TipoMovimiento.INGRESO, mov.getTipo());
        assertEquals(kg("5.000"), mov.getCantidad());
        assertEquals(kg("7.000"), mov.getSaldo());
        assertEquals(10L, mov.getRegistroIngresoId());
        assertNull(mov.getPedidoDetalleId());
        assertNull(mov.getRegistroMermaId());
        assertEquals(kg("7.000"), stockGuardado(sal));
    }

    @Test
    void consumo_RestaExactoConTresDecimales() {
        // 5 g de sal por platillo: con 2 decimales se redondeaba a 0,01 kg o a 0,00 kg
        MovimientoInventario mov = inventarioService.registrarConsumo(sal.getId(), kg("0.005"), 20L, almacenero);

        assertEquals(kg("-0.005"), mov.getCantidad());
        assertEquals(kg("1.995"), mov.getSaldo());
        assertEquals(20L, mov.getPedidoDetalleId());
        assertEquals(kg("1.995"), stockGuardado(sal));
    }

    @Test
    void merma_RestaYQuedaComoMovimientoNegativo() {
        MovimientoInventario mov = inventarioService.registrarMerma(sal.getId(), kg("0.250"), 30L, almacenero);

        assertEquals(TipoMovimiento.MERMA, mov.getTipo());
        assertEquals(kg("-0.250"), mov.getCantidad());
        assertEquals(30L, mov.getRegistroMermaId());
        assertEquals(kg("1.750"), stockGuardado(sal));
    }

    @Test
    void cadaMovimientoGuardaElSaldoQueQuedo_YElUltimoEsElStock() {
        inventarioService.registrarIngreso(sal.getId(), kg("1"), 10L, almacenero);
        inventarioService.registrarConsumo(sal.getId(), kg("0.25"), 20L, almacenero);
        inventarioService.registrarMerma(sal.getId(), kg("0.1"), 30L, almacenero);

        BigDecimal stock = stockGuardado(sal);
        List<MovimientoInventario> kardex = movimientoRepository.findByIngredienteIdOrderByFechaAscIdAsc(sal.getId());

        assertEquals(List.of(kg("3.000"), kg("2.750"), kg("2.650")),
                kardex.stream().map(MovimientoInventario::getSaldo).toList());
        assertEquals(kg("2.650"), stock);
        // El saldo inicial (2.000) más la suma de los movimientos da el stock
        BigDecimal suma = kardex.stream().map(MovimientoInventario::getCantidad).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, kg("2.000").add(suma).compareTo(stock));
    }

    @Test
    void cantidadCeroONegativa_Responde400_YNoMueveNada() {
        for (String cantidad : new String[]{"0", "-1"}) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> inventarioService.registrarConsumo(sal.getId(), kg(cantidad), 20L, almacenero));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        }
        assertThrows(ResponseStatusException.class,
                () -> inventarioService.registrarIngreso(sal.getId(), null, 10L, almacenero));

        assertEquals(kg("2.000"), stockGuardado(sal));
        assertEquals(0, movimientoRepository.count());
    }

    @Test
    void masDeTresDecimales_Responde400_NoSeRedondeaAEscondidas() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> inventarioService.registrarConsumo(sal.getId(), kg("0.0005"), 20L, almacenero));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals(kg("2.000"), stockGuardado(sal));
    }

    @Test
    void ceroDeMasALaDerecha_NoCuentaComoDecimal() {
        MovimientoInventario mov = inventarioService.registrarIngreso(sal.getId(), kg("1.50000"), 10L, almacenero);

        assertEquals(kg("1.500"), mov.getCantidad());
    }

    @Test
    void insumoDeOtroRestaurante_Responde404_YNoLoMueve() {
        Ingrediente salNorte = insumo(norte, "Sal", "4.000");
        entityManager.flush();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> inventarioService.registrarConsumo(salNorte.getId(), kg("1"), 20L, almacenero));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals(kg("4.000"), stockGuardado(salNorte));
    }

    @Test
    void mismoPlatilloDescontandoDosVecesElMismoInsumo_Responde409_YNoDescuentaDeNuevo() {
        inventarioService.registrarConsumo(sal.getId(), kg("0.5"), 20L, almacenero);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> inventarioService.registrarConsumo(sal.getId(), kg("0.5"), 20L, almacenero));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals(kg("1.500"), stockGuardado(sal));
        assertEquals(1, movimientoRepository.count());
    }

    @Test
    void mismoPlatilloConOtroInsumo_SiDescuenta() {
        Ingrediente arroz = insumo(sal.getRestaurante(), "Arroz", "10.000");
        entityManager.flush();

        inventarioService.registrarConsumo(sal.getId(), kg("0.005"), 20L, almacenero);
        inventarioService.registrarConsumo(arroz.getId(), kg("0.200"), 20L, almacenero);

        assertEquals(2, movimientoRepository.count());
        assertEquals(kg("9.800"), stockGuardado(arroz));
    }

    @Test
    void compraOMermaRepetida_Responde409() {
        inventarioService.registrarIngreso(sal.getId(), kg("1"), 10L, almacenero);
        inventarioService.registrarMerma(sal.getId(), kg("0.1"), 30L, almacenero);

        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> inventarioService.registrarIngreso(sal.getId(), kg("1"), 10L, almacenero)).getStatusCode());
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> inventarioService.registrarMerma(sal.getId(), kg("0.1"), 30L, almacenero)).getStatusCode());
        assertEquals(kg("2.900"), stockGuardado(sal));
    }

    @Test
    void consumoSinStockSuficiente_DejaElSaldoNegativo_HastaQueDecidaElPO() {
        // Planning 3, punto 3: se sirve igual y salta la alerta de la HU-16 (pendiente de confirmar por Diego)
        MovimientoInventario mov = inventarioService.registrarConsumo(sal.getId(), kg("2.5"), 20L, almacenero);

        assertEquals(kg("-0.500"), mov.getSaldo());
        assertEquals(kg("-0.500"), stockGuardado(sal));
    }

    @Test
    void stockQueSuperaElMaximoDeLaColumna_Responde400() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> inventarioService.registrarIngreso(sal.getId(), kg("9999999"), 10L, almacenero));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals(kg("2.000"), stockGuardado(sal));
    }

    @Test
    void losCambiosDelLlamadorEnElInsumo_NoSePierden() {
        // HU-14 puede actualizar el costo del insumo con el precio de la compra antes de sumar el stock
        sal.setCostoUnitario(new BigDecimal("1.80"));

        inventarioService.registrarIngreso(sal.getId(), kg("1"), 10L, almacenero);

        entityManager.flush();
        entityManager.clear();
        Ingrediente guardada = entityManager.find(Ingrediente.class, sal.getId());
        assertEquals(new BigDecimal("1.80"), guardada.getCostoUnitario());
        assertEquals(kg("3.000"), guardada.getStockActual());
    }

    @Test
    void sinOrigen_NoSeRegistra() {
        assertThrows(NullPointerException.class,
                () -> inventarioService.registrarConsumo(sal.getId(), kg("1"), null, almacenero));
        assertEquals(0, movimientoRepository.count());
    }
}
