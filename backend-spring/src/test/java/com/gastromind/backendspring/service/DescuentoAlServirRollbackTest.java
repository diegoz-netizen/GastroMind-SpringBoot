package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.CambioEstadoPlatilloRequest;
import com.gastromind.backendspring.entity.Categoria;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.EstadoPlatillo;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.Mesa;
import com.gastromind.backendspring.entity.Pedido;
import com.gastromind.backendspring.entity.PedidoDetalle;
import com.gastromind.backendspring.entity.Producto;
import com.gastromind.backendspring.entity.RecetaDetalle;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
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
 * HU-13: el estado del platillo y el descuento van en una sola transacción. Sin @Transactional en el test,
 * para que la transacción real de PedidoService haga rollback de verdad.
 */
@SpringBootTest
@ActiveProfiles("test")
class DescuentoAlServirRollbackTest {

    @Autowired
    private PedidoService pedidoService;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private Empleado mozo;
    private Pedido pedido;
    private PedidoDetalle detalle;
    private Ingrediente arroz;
    private Ingrediente alBorde;

    @BeforeEach
    void setUp() {
        transactionTemplate.executeWithoutResult(estado -> {
            Restaurante restaurante = Restaurante.builder().nombre("Restaurante Rollback").build();
            Rol rol = Rol.builder().nombre("MOZO").build();
            entityManager.persist(restaurante);
            entityManager.persist(rol);
            mozo = Empleado.builder().restaurante(restaurante).rol(rol).nombreCompleto("Mozo")
                    .correo("rollback@test.com").passwordHash("hash").build();
            entityManager.persist(mozo);
            Mesa mesa = Mesa.builder().restaurante(restaurante).numero(1).estado(Mesa.OCUPADA).build();
            entityManager.persist(mesa);
            Categoria categoria = Categoria.builder().restaurante(restaurante).nombre("Fondos").build();
            entityManager.persist(categoria);
            Producto plato = Producto.builder().categoria(categoria).nombre("Arroz con pollo")
                    .precio(new BigDecimal("22.00")).build();
            entityManager.persist(plato);
            arroz = Ingrediente.builder().restaurante(restaurante).nombre("Arroz").unidadMedida("kg")
                    .stockActual(new BigDecimal("10.000")).costoUnitario(new BigDecimal("4.50")).build();
            entityManager.persist(arroz);
            // Al borde del máximo negativo: descontarle algo hace fallar a InventarioService
            alBorde = Ingrediente.builder().restaurante(restaurante).nombre("Pollo").unidadMedida("kg")
                    .stockActual(new BigDecimal("-9999999.000")).costoUnitario(new BigDecimal("4.50")).build();
            entityManager.persist(alBorde);
            // El arroz tiene el id menor: se descuenta primero y el rollback tiene que devolverlo
            entityManager.persist(RecetaDetalle.builder().producto(plato).ingrediente(arroz)
                    .cantidadRequerida(new BigDecimal("0.200")).build());
            entityManager.persist(RecetaDetalle.builder().producto(plato).ingrediente(alBorde)
                    .cantidadRequerida(new BigDecimal("5.000")).build());
            pedido = Pedido.builder().mesa(mesa).empleado(mozo).build();
            detalle = PedidoDetalle.builder().pedido(pedido).producto(plato).cantidad(1)
                    .estado(EstadoPlatillo.LISTO).build();
            pedido.getDetalles().add(detalle);
            entityManager.persist(pedido);
        });
    }

    @AfterEach
    void limpiar() {
        transactionTemplate.executeWithoutResult(estado -> {
            for (String entidad : List.of("MovimientoInventario", "PedidoDetalle", "Pedido", "RecetaDetalle", "Producto",
                    "Categoria", "Mesa", "Ingrediente", "Empleado", "Rol", "Restaurante")) {
                entityManager.createQuery("DELETE FROM " + entidad).executeUpdate();
            }
        });
    }

    @Test
    void siUnInsumoFalla_NoQuedaNadaDescontadoYElPlatilloSigueListo() {
        var autenticacion = new UsernamePasswordAuthenticationToken(mozo.getId(), null, List.of());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                pedidoService.cambiarEstadoPlatillo(pedido.getId(), detalle.getId(),
                        new CambioEstadoPlatilloRequest("SERVIDO"), autenticacion));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        transactionTemplate.executeWithoutResult(estado -> {
            assertEquals(EstadoPlatillo.LISTO, entityManager.find(PedidoDetalle.class, detalle.getId()).getEstado());
            assertEquals(0, new BigDecimal("10.000")
                    .compareTo(entityManager.find(Ingrediente.class, arroz.getId()).getStockActual()));
            assertEquals(0L, entityManager.createQuery("SELECT COUNT(m) FROM MovimientoInventario m", Long.class)
                    .getSingleResult());
        });
    }
}
