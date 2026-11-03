package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.IngresoCompraRequest;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.Proveedor;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.repository.IngredienteRepository;
import com.gastromind.backendspring.repository.RegistroIngresoProveedorRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * HU-14: la compra y el movimiento van en una sola transacción. Sin @Transactional en el test,
 * para que la transacción real de CompraService haga commit o rollback de verdad.
 */
@SpringBootTest
@ActiveProfiles("test")
class CompraServiceRollbackTest {

    @Autowired
    private CompraService compraService;

    @Autowired
    private IngredienteRepository ingredienteRepository;

    @Autowired
    private RegistroIngresoProveedorRepository registroRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private Restaurante restaurante;
    private Rol rol;
    private Empleado almacenero;
    private Proveedor proveedor;
    private Ingrediente casiLleno;

    @BeforeEach
    void setUp() {
        transactionTemplate.executeWithoutResult(estado -> {
            restaurante = Restaurante.builder().nombre("Restaurante Rollback").build();
            rol = Rol.builder().nombre("ALMACENERO").build();
            entityManager.persist(restaurante);
            entityManager.persist(rol);
            almacenero = Empleado.builder().restaurante(restaurante).rol(rol).nombreCompleto("Almacenero")
                    .correo("rollback@test.com").passwordHash("hash").build();
            entityManager.persist(almacenero);
            proveedor = Proveedor.builder().restaurante(restaurante).nombre("Proveedor").build();
            entityManager.persist(proveedor);
            // Al borde del máximo: cualquier ingreso hace fallar a InventarioService
            casiLleno = Ingrediente.builder().restaurante(restaurante).nombre("Arroz").unidadMedida("kg")
                    .stockActual(new BigDecimal("9999999.000")).costoUnitario(new BigDecimal("4.50")).build();
            entityManager.persist(casiLleno);
        });
    }

    @AfterEach
    void limpiar() {
        transactionTemplate.executeWithoutResult(estado -> {
            for (String entidad : List.of("MovimientoInventario", "RegistroIngresoProveedor", "Ingrediente",
                    "Proveedor", "Empleado", "Rol", "Restaurante")) {
                entityManager.createQuery("DELETE FROM " + entidad).executeUpdate();
            }
        });
    }

    @Test
    void siElMovimientoFalla_LaCompraNoQueda() {
        IngresoCompraRequest request = new IngresoCompraRequest(proveedor.getId(), casiLleno.getId(),
                new BigDecimal("5"), new BigDecimal("10.00"), null, null);
        var autenticacion = new UsernamePasswordAuthenticationToken(almacenero.getId(), null, List.of());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> compraService.registrar(request, autenticacion));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals(0, registroRepository.count());
        assertEquals(0, new BigDecimal("9999999.000")
                .compareTo(ingredienteRepository.findById(casiLleno.getId()).orElseThrow().getStockActual()));
    }
}
