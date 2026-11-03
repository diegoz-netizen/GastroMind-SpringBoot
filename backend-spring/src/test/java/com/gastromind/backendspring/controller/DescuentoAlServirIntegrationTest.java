package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.entity.Categoria;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.EstadoPlatillo;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.Mesa;
import com.gastromind.backendspring.entity.MovimientoInventario;
import com.gastromind.backendspring.entity.Pedido;
import com.gastromind.backendspring.entity.PedidoDetalle;
import com.gastromind.backendspring.entity.Producto;
import com.gastromind.backendspring.entity.RecetaDetalle;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.entity.TipoMovimiento;
import com.gastromind.backendspring.repository.MovimientoInventarioRepository;
import com.gastromind.backendspring.security.JwtTokenProvider;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HU-13 (CA-13) de punta a punta (H2): al servir, el stock baja lo que indica la receta y queda el movimiento.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DescuentoAlServirIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private MovimientoInventarioRepository movimientoRepository;

    private Restaurante restaurante;
    private Empleado mozo;
    private String tokenMozo;
    private String tokenCocinero;
    private Mesa mesa;
    private Categoria categoria;
    private Ingrediente arroz;
    private Ingrediente pollo;

    @BeforeEach
    void setUp() {
        restaurante = persistir(Restaurante.builder().nombre("Central").build());
        mozo = empleado("MOZO", "mozo@test.com");
        tokenMozo = "Bearer " + jwtTokenProvider.generarToken(mozo);
        tokenCocinero = "Bearer " + jwtTokenProvider.generarToken(empleado("COCINERO", "cocina@test.com"));
        mesa = persistir(Mesa.builder().restaurante(restaurante).numero(1).estado(Mesa.OCUPADA).build());
        categoria = persistir(Categoria.builder().restaurante(restaurante).nombre("Fondos").build());
        arroz = insumo("Arroz", "10.000", "RECETA");
        pollo = insumo("Pollo", "5.000", "RECETA");
        entityManager.flush();
    }

    private <T> T persistir(T entidad) {
        entityManager.persist(entidad);
        return entidad;
    }

    private Empleado empleado(String nombreRol, String correo) {
        Rol rol = persistir(Rol.builder().nombre(nombreRol).build());
        return persistir(Empleado.builder().restaurante(restaurante).rol(rol)
                .nombreCompleto(nombreRol).correo(correo).passwordHash("hash").build());
    }

    private Ingrediente insumo(String nombre, String stock, String control) {
        Ingrediente.IngredienteBuilder insumo = Ingrediente.builder().restaurante(restaurante).nombre(nombre)
                .unidadMedida("kg").stockActual(new BigDecimal(stock)).costoUnitario(new BigDecimal("4.50"))
                .tipoControl(control);
        if ("LIBRE".equals(control)) {
            insumo.dotacionCantidad(new BigDecimal("8.000")).dotacionPeriodo("SEMANAL");
        }
        return persistir(insumo.build());
    }

    private Producto platillo(String nombre, boolean requiereReceta) {
        return persistir(Producto.builder().categoria(categoria).nombre(nombre)
                .precio(new BigDecimal("22.00")).requiereReceta(requiereReceta).build());
    }

    private void receta(Producto producto, Ingrediente insumo, String cantidad) {
        persistir(RecetaDetalle.builder().producto(producto).ingrediente(insumo)
                .cantidadRequerida(new BigDecimal(cantidad)).build());
    }

    private PedidoDetalle pedirListo(Producto producto, int porciones) {
        Pedido pedido = Pedido.builder().mesa(mesa).empleado(mozo).build();
        PedidoDetalle detalle = PedidoDetalle.builder().pedido(pedido).producto(producto)
                .cantidad(porciones).estado(EstadoPlatillo.LISTO).build();
        pedido.getDetalles().add(detalle);
        entityManager.persist(pedido);
        entityManager.flush();
        return detalle;
    }

    private ResultActions cambiar(PedidoDetalle detalle, String estado, String token) throws Exception {
        return mockMvc.perform(patch("/api/pedidos/" + detalle.getPedido().getId() + "/detalles/" + detalle.getId() + "/estado")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"" + estado + "\"}"));
    }

    private BigDecimal stockDe(Ingrediente insumo) {
        entityManager.flush();
        entityManager.clear();
        return entityManager.find(Ingrediente.class, insumo.getId()).getStockActual();
    }

    private List<MovimientoInventario> movimientos() {
        entityManager.flush();
        return movimientoRepository.findAll();
    }

    @Test
    void alServir_BajaLaRecetaPorLasPorcionesYDejaElMovimiento() throws Exception {
        Producto arrozConPollo = platillo("Arroz con pollo", true);
        receta(arrozConPollo, arroz, "0.200");
        receta(arrozConPollo, pollo, "0.250");
        PedidoDetalle detalle = pedirListo(arrozConPollo, 3);

        cambiar(detalle, "SERVIDO", tokenMozo).andExpect(status().isOk());

        assertThat(stockDe(arroz)).isEqualByComparingTo("9.400");
        assertThat(stockDe(pollo)).isEqualByComparingTo("4.250");
        List<MovimientoInventario> movimientos = movimientos();
        assertThat(movimientos).hasSize(2);
        assertThat(movimientos).allSatisfy(m -> {
            assertThat(m.getTipo()).isEqualTo(TipoMovimiento.CONSUMO);
            assertThat(m.getPedidoDetalleId()).isEqualTo(detalle.getId());
            assertThat(m.getEmpleado().getId()).isEqualTo(mozo.getId());
        });
        assertThat(movimientos).extracting(m -> m.getCantidad().toPlainString())
                .containsExactlyInAnyOrder("-0.600", "-0.750");
        assertThat(movimientos).extracting(m -> m.getSaldo().toPlainString())
                .containsExactlyInAnyOrder("9.400", "4.250");
    }

    @Test
    void antesDeServir_NoBajaNada() throws Exception {
        Producto plato = platillo("Arroz chaufa", true);
        receta(plato, arroz, "0.200");
        PedidoDetalle detalle = pedirListo(plato, 1);
        detalle.setEstado(EstadoPlatillo.PENDIENTE);
        entityManager.flush();

        cambiar(detalle, "EN_PREPARACION", tokenCocinero).andExpect(status().isOk());
        cambiar(detalle, "LISTO", tokenCocinero).andExpect(status().isOk());

        assertThat(stockDe(arroz)).isEqualByComparingTo("10.000");
        assertThat(movimientos()).isEmpty();
    }

    @Test
    void platilloAnulado_NoBajaNada() throws Exception {
        Producto plato = platillo("Arroz chaufa", true);
        receta(plato, arroz, "0.200");
        PedidoDetalle detalle = pedirListo(plato, 1);
        detalle.setEstado(EstadoPlatillo.PENDIENTE);
        entityManager.flush();

        cambiar(detalle, "ANULADO", tokenMozo).andExpect(status().isOk());

        assertThat(stockDe(arroz)).isEqualByComparingTo("10.000");
        assertThat(movimientos()).isEmpty();
    }

    @Test
    void servirDosVeces_DescuentaUnaSola() throws Exception {
        Producto plato = platillo("Arroz chaufa", true);
        receta(plato, arroz, "0.200");
        PedidoDetalle detalle = pedirListo(plato, 1);

        cambiar(detalle, "SERVIDO", tokenMozo).andExpect(status().isOk());
        cambiar(detalle, "SERVIDO", tokenMozo).andExpect(status().isConflict());

        assertThat(stockDe(arroz)).isEqualByComparingTo("9.800");
        assertThat(movimientos()).hasSize(1);
    }

    @Test
    void sinReceta_SeSirveSinMovimientos() throws Exception {
        PedidoDetalle bebida = pedirListo(platillo("Chicha", false), 2);
        PedidoDetalle sinRecetaCargada = pedirListo(platillo("Lomo", true), 1);

        cambiar(bebida, "SERVIDO", tokenMozo).andExpect(status().isOk());
        cambiar(sinRecetaCargada, "SERVIDO", tokenMozo).andExpect(status().isOk());

        assertThat(movimientos()).isEmpty();
    }

    @Test
    void insumoLibre_NoSeDescuentaPorReceta() throws Exception {
        Ingrediente detergente = insumo("Detergente", "6.000", "LIBRE");
        Producto plato = platillo("Arroz chaufa", true);
        receta(plato, arroz, "0.200");
        receta(plato, detergente, "0.010");
        PedidoDetalle detalle = pedirListo(plato, 1);

        cambiar(detalle, "SERVIDO", tokenMozo).andExpect(status().isOk());

        assertThat(stockDe(detergente)).isEqualByComparingTo("6.000");
        assertThat(stockDe(arroz)).isEqualByComparingTo("9.800");
        assertThat(movimientos()).hasSize(1);
    }

    @Test
    void sinStock_SeSirveIgualYQuedaNegativo() throws Exception {
        Producto plato = platillo("Arroz chaufa", true);
        receta(plato, pollo, "6.000");
        PedidoDetalle detalle = pedirListo(plato, 1);

        cambiar(detalle, "SERVIDO", tokenMozo).andExpect(status().isOk());

        assertThat(stockDe(pollo)).isEqualByComparingTo("-1.000");
    }
}
