package com.gastromind.backendspring.service;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.MovimientoInventario;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.repository.MovimientoInventarioRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Dos cocineros sirven a la vez platillos que usan el mismo insumo: con el bloqueo de la fila,
 * ningún descuento pisa a otro y cada movimiento guarda un saldo distinto.
 * Usa transacciones reales (sin @Transactional en el test), por eso limpia lo que crea.
 */
@SpringBootTest
@ActiveProfiles("test")
class InventarioServiceConcurrenciaTest {

    private static final int HILOS = 2;
    private static final int CONSUMOS_POR_HILO = 20;

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private MovimientoInventarioRepository movimientoRepository;

    @Autowired
    private TransactionTemplate transaccion;

    @Autowired
    private EntityManager entityManager;

    private Restaurante restaurante;
    private Rol rol;
    private Empleado cocinero;
    private Ingrediente arroz;

    @BeforeEach
    void setUp() {
        transaccion.executeWithoutResult(estado -> {
            restaurante = Restaurante.builder().nombre("Sede Concurrencia").build();
            entityManager.persist(restaurante);
            rol = Rol.builder().nombre("COCINERO_CONCURRENCIA").build();
            entityManager.persist(rol);
            cocinero = Empleado.builder().restaurante(restaurante).rol(rol).nombreCompleto("Cocinero")
                    .correo("cocinero.concurrencia@test.com").passwordHash("hash").build();
            entityManager.persist(cocinero);
            arroz = Ingrediente.builder().restaurante(restaurante).nombre("Arroz").unidadMedida("kg")
                    .stockActual(new BigDecimal("10.000")).costoUnitario(new BigDecimal("3.80")).build();
            entityManager.persist(arroz);
        });
    }

    @AfterEach
    void limpiar() {
        transaccion.executeWithoutResult(estado -> {
            entityManager.createQuery("DELETE FROM MovimientoInventario m WHERE m.ingrediente.id = :id")
                    .setParameter("id", arroz.getId()).executeUpdate();
            entityManager.remove(entityManager.find(Ingrediente.class, arroz.getId()));
            entityManager.remove(entityManager.find(Empleado.class, cocinero.getId()));
            entityManager.remove(entityManager.find(Rol.class, rol.getId()));
            entityManager.remove(entityManager.find(Restaurante.class, restaurante.getId()));
        });
    }

    @Test
    void consumosAlMismoTiempo_NoPierdenNingunDescuento() throws Exception {
        CountDownLatch largada = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(HILOS);
        List<Future<?>> tareas = new ArrayList<>();
        for (int h = 0; h < HILOS; h++) {
            long base = (h + 1) * 1000L;
            tareas.add(pool.submit(() -> {
                largada.await();
                for (int i = 0; i < CONSUMOS_POR_HILO; i++) {
                    // Cada platillo servido es un pedido_detalle distinto
                    inventarioService.registrarConsumo(arroz.getId(), new BigDecimal("0.100"), base + i, cocinero);
                }
                return null;
            }));
        }
        largada.countDown();
        for (Future<?> tarea : tareas) {
            tarea.get(); // si un hilo falló, el test falla con su excepción
        }
        pool.shutdown();

        BigDecimal stock = transaccion.execute(estado ->
                entityManager.find(Ingrediente.class, arroz.getId()).getStockActual());
        List<MovimientoInventario> kardex = movimientoRepository.findByIngredienteIdOrderByFechaAscIdAsc(arroz.getId());
        Set<BigDecimal> saldos = kardex.stream().map(MovimientoInventario::getSaldo).collect(Collectors.toSet());

        // 10 kg - 40 x 0,100 kg = 6 kg, y 40 saldos distintos (ninguno se repitió por pisarse)
        assertEquals(new BigDecimal("6.000"), stock);
        assertEquals(HILOS * CONSUMOS_POR_HILO, kardex.size());
        assertEquals(HILOS * CONSUMOS_POR_HILO, saldos.size());
        assertEquals(new BigDecimal("6.000"), saldos.stream().min(BigDecimal::compareTo).orElseThrow());
    }
}
