package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.MermaRequest;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.MotivoMerma;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.repository.IngredienteRepository;
import com.gastromind.backendspring.repository.RegistroMermaRepository;
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
 * HU-17: la merma y el movimiento van en una sola transacción. Sin @Transactional en el test,
 * para que la transacción real de MermaService haga commit o rollback de verdad.
 */
@SpringBootTest
@ActiveProfiles("test")
class MermaServiceRollbackTest {

    @Autowired
    private MermaService mermaService;

    @Autowired
    private IngredienteRepository ingredienteRepository;

    @Autowired
    private RegistroMermaRepository mermaRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private Empleado almacenero;
    private Ingrediente casiVacio;
    private MotivoMerma vencido;

    @BeforeEach
    void setUp() {
        transactionTemplate.executeWithoutResult(estado -> {
            Restaurante restaurante = Restaurante.builder().nombre("Restaurante Rollback").build();
            Rol rol = Rol.builder().nombre("ALMACENERO").build();
            entityManager.persist(restaurante);
            entityManager.persist(rol);
            almacenero = Empleado.builder().restaurante(restaurante).rol(rol).nombreCompleto("Almacenero")
                    .correo("rollback-merma@test.com").passwordHash("hash").build();
            entityManager.persist(almacenero);
            // Al borde del mínimo permitido: cualquier merma hace fallar a InventarioService
            casiVacio = Ingrediente.builder().restaurante(restaurante).nombre("Arroz").unidadMedida("kg")
                    .stockActual(new BigDecimal("-9999999.000")).costoUnitario(new BigDecimal("4.50")).build();
            entityManager.persist(casiVacio);
            vencido = MotivoMerma.builder().nombre("VENCIDO").esGlobal(true).build();
            entityManager.persist(vencido);
        });
    }

    @AfterEach
    void limpiar() {
        transactionTemplate.executeWithoutResult(estado -> {
            for (String entidad : List.of("MovimientoInventario", "RegistroMerma", "MotivoMerma", "Ingrediente",
                    "Empleado", "Rol", "Restaurante")) {
                entityManager.createQuery("DELETE FROM " + entidad).executeUpdate();
            }
        });
    }

    @Test
    void siElMovimientoFalla_LaMermaNoQueda() {
        MermaRequest request = new MermaRequest(casiVacio.getId(), new BigDecimal("5"), vencido.getId());
        var autenticacion = new UsernamePasswordAuthenticationToken(almacenero.getId(), null, List.of());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> mermaService.registrar(request, autenticacion));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals(0, mermaRepository.count());
        assertEquals(0, new BigDecimal("-9999999.000")
                .compareTo(ingredienteRepository.findById(casiVacio.getId()).orElseThrow().getStockActual()));
    }
}
