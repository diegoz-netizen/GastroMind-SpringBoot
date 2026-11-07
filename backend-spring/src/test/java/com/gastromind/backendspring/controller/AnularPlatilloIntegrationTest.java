package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.entity.Categoria;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.EstadoPedido;
import com.gastromind.backendspring.entity.EstadoPlatillo;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.Mesa;
import com.gastromind.backendspring.entity.MotivoMerma;
import com.gastromind.backendspring.entity.MovimientoInventario;
import com.gastromind.backendspring.entity.Pedido;
import com.gastromind.backendspring.entity.PedidoDetalle;
import com.gastromind.backendspring.entity.Producto;
import com.gastromind.backendspring.entity.RecetaDetalle;
import com.gastromind.backendspring.entity.RegistroMerma;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.entity.TipoMovimiento;
import com.gastromind.backendspring.repository.MovimientoInventarioRepository;
import com.gastromind.backendspring.repository.RegistroMermaRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HU-18 (CA-18) de punta a punta (H2): anular un platillo que ya entró a cocina registra sus insumos como merma,
 * con el motivo que se elige. Lo pendiente se anula sin merma.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AnularPlatilloIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private MovimientoInventarioRepository movimientoRepository;

    @Autowired
    private RegistroMermaRepository mermaRepository;

    private Restaurante restaurante;
    private Empleado mozo;
    private Empleado cocinero;
    private String tokenMozo;
    private String tokenCocinero;
    private String tokenAlmacenero;
    private String tokenOtroRestaurante;
    private Mesa mesa;
    private Categoria categoria;
    private Ingrediente arroz;
    private Ingrediente pollo;
    private Ingrediente aceite;
    private MotivoMerma platoAnulado;
    private MotivoMerma deOtroRestaurante;
    private final java.util.Map<String, Rol> roles = new java.util.HashMap<>();

    @BeforeEach
    void setUp() {
        restaurante = persistir(Restaurante.builder().nombre("Central").build());
        Restaurante otro = persistir(Restaurante.builder().nombre("Norte").build());
        mozo = empleado(restaurante, "MOZO", "mozo@test.com");
        cocinero = empleado(restaurante, "COCINERO", "cocina@test.com");
        tokenMozo = token(mozo);
        tokenCocinero = token(cocinero);
        tokenAlmacenero = token(empleado(restaurante, "ALMACENERO", "almacen@test.com"));
        tokenOtroRestaurante = token(empleado(otro, "COCINERO", "cocina@norte.com"));
        mesa = persistir(Mesa.builder().restaurante(restaurante).numero(1).estado(Mesa.OCUPADA).build());
        categoria = persistir(Categoria.builder().restaurante(restaurante).nombre("Fondos").build());
        arroz = insumo("Arroz", "10.000", "RECETA");
        pollo = insumo("Pollo", "5.000", "RECETA");
        aceite = insumo("Aceite", "3.000", "LIBRE");
        platoAnulado = persistir(MotivoMerma.builder().nombre("PLATO_ANULADO").esGlobal(true).build());
        deOtroRestaurante = persistir(MotivoMerma.builder().restaurante(otro).nombre("PROPIO").esGlobal(false).build());
        entityManager.flush();
    }

    private <T> T persistir(T entidad) {
        entityManager.persist(entidad);
        return entidad;
    }

    private String token(Empleado empleado) {
        return "Bearer " + jwtTokenProvider.generarToken(empleado);
    }

    private Empleado empleado(Restaurante local, String nombreRol, String correo) {
        // El nombre del rol es único: el cocinero de Norte usa el mismo rol que el de Central
        Rol rol = roles.computeIfAbsent(nombreRol, n -> persistir(Rol.builder().nombre(n).build()));
        return persistir(Empleado.builder().restaurante(local).rol(rol)
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

    // Arroz con pollo: 0,200 kg de arroz, 0,250 kg de pollo y aceite LIBRE (no se cuenta por receta)
    private PedidoDetalle pedir(EstadoPlatillo estado, int porciones) {
        Producto plato = persistir(Producto.builder().categoria(categoria).nombre("Arroz con pollo")
                .precio(new BigDecimal("22.00")).requiereReceta(true).build());
        receta(plato, arroz, "0.200");
        receta(plato, pollo, "0.250");
        receta(plato, aceite, "0.020");
        Pedido pedido = Pedido.builder().mesa(mesa).empleado(mozo).build();
        PedidoDetalle detalle = PedidoDetalle.builder().pedido(pedido).producto(plato)
                .cantidad(porciones).estado(estado).build();
        pedido.getDetalles().add(detalle);
        entityManager.persist(pedido);
        entityManager.flush();
        return detalle;
    }

    private void receta(Producto producto, Ingrediente insumo, String cantidad) {
        persistir(RecetaDetalle.builder().producto(producto).ingrediente(insumo)
                .cantidadRequerida(new BigDecimal(cantidad)).build());
    }

    private ResultActions anular(PedidoDetalle detalle, Long motivoId, String token) throws Exception {
        return mockMvc.perform(post("/api/pedidos/" + detalle.getPedido().getId() + "/detalles/" + detalle.getId()
                + "/anular")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(motivoId == null ? "{}" : "{\"motivoId\":" + motivoId + "}"));
    }

    private BigDecimal stockDe(Ingrediente insumo) {
        entityManager.flush();
        entityManager.clear();
        return entityManager.find(Ingrediente.class, insumo.getId()).getStockActual();
    }

    private EstadoPlatillo estadoDe(PedidoDetalle detalle) {
        entityManager.flush();
        entityManager.clear();
        return entityManager.find(PedidoDetalle.class, detalle.getId()).getEstado();
    }

    @Test
    void platilloEnPreparacion_RegistraSusInsumosComoMermaConElMotivo() throws Exception {
        PedidoDetalle detalle = pedir(EstadoPlatillo.EN_PREPARACION, 2);

        anular(detalle, platoAnulado.getId(), tokenCocinero)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detalles[0].estado").value("ANULADO"));

        assertThat(stockDe(arroz)).isEqualByComparingTo("9.600");
        assertThat(stockDe(pollo)).isEqualByComparingTo("4.500");
        assertThat(stockDe(aceite)).isEqualByComparingTo("3.000");

        List<RegistroMerma> mermas = mermaRepository.findAll();
        assertThat(mermas).hasSize(2);
        assertThat(mermas).allSatisfy(m -> {
            assertThat(m.getMotivo().getId()).isEqualTo(platoAnulado.getId());
            assertThat(m.getEmpleado().getId()).isEqualTo(cocinero.getId());
        });
        assertThat(mermas).extracting(m -> m.getCantidad().toPlainString())
                .containsExactlyInAnyOrder("0.400", "0.500");

        List<MovimientoInventario> movimientos = movimientoRepository.findAll();
        assertThat(movimientos).hasSize(2);
        assertThat(movimientos).allSatisfy(m -> assertThat(m.getTipo()).isEqualTo(TipoMovimiento.MERMA));
        assertThat(movimientos).extracting(MovimientoInventario::getRegistroMermaId)
                .containsExactlyInAnyOrderElementsOf(mermas.stream().map(RegistroMerma::getId).toList());
    }

    @Test
    void platilloListo_TambienEsMermaYLoPuedeAnularElMozo() throws Exception {
        PedidoDetalle detalle = pedir(EstadoPlatillo.LISTO, 1);

        anular(detalle, platoAnulado.getId(), tokenMozo).andExpect(status().isOk());

        assertThat(estadoDe(detalle)).isEqualTo(EstadoPlatillo.ANULADO);
        assertThat(stockDe(arroz)).isEqualByComparingTo("9.800");
        assertThat(mermaRepository.findAll()).hasSize(2);
    }

    @Test
    void platilloPendiente_SeAnulaSinMermaYSinMotivo() throws Exception {
        PedidoDetalle detalle = pedir(EstadoPlatillo.PENDIENTE, 1);

        anular(detalle, null, tokenMozo).andExpect(status().isOk());

        assertThat(estadoDe(detalle)).isEqualTo(EstadoPlatillo.ANULADO);
        assertThat(stockDe(arroz)).isEqualByComparingTo("10.000");
        assertThat(mermaRepository.findAll()).isEmpty();
        assertThat(movimientoRepository.findAll()).isEmpty();
    }

    @Test
    void yaEnCocinaSinMotivoODeOtroRestaurante_Responde400YNoTocaNada() throws Exception {
        PedidoDetalle detalle = pedir(EstadoPlatillo.EN_PREPARACION, 1);

        anular(detalle, null, tokenCocinero)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El motivo es obligatorio"));
        anular(detalle, deOtroRestaurante.getId(), tokenCocinero).andExpect(status().isBadRequest());

        assertThat(estadoDe(detalle)).isEqualTo(EstadoPlatillo.EN_PREPARACION);
        assertThat(stockDe(arroz)).isEqualByComparingTo("10.000");
        assertThat(mermaRepository.findAll()).isEmpty();
    }

    @Test
    void servidoOAnulado_Responde409() throws Exception {
        PedidoDetalle servido = pedir(EstadoPlatillo.SERVIDO, 1);
        anular(servido, platoAnulado.getId(), tokenCocinero).andExpect(status().isConflict());

        PedidoDetalle anulado = pedir(EstadoPlatillo.ANULADO, 1);
        anular(anulado, platoAnulado.getId(), tokenCocinero).andExpect(status().isConflict());

        assertThat(mermaRepository.findAll()).isEmpty();
    }

    @Test
    void anularDosVeces_RegistraLaMermaUnaSolaVez() throws Exception {
        PedidoDetalle detalle = pedir(EstadoPlatillo.EN_PREPARACION, 1);

        anular(detalle, platoAnulado.getId(), tokenCocinero).andExpect(status().isOk());
        anular(detalle, platoAnulado.getId(), tokenCocinero).andExpect(status().isConflict());

        assertThat(mermaRepository.findAll()).hasSize(2);
        assertThat(stockDe(arroz)).isEqualByComparingTo("9.800");
    }

    @Test
    void rolQueNoLeToca_Responde403() throws Exception {
        // El cocinero no anula lo pendiente (es decisión del mozo); el almacenero no anula nada
        PedidoDetalle pendiente = pedir(EstadoPlatillo.PENDIENTE, 1);
        anular(pendiente, null, tokenCocinero).andExpect(status().isForbidden());

        PedidoDetalle enCocina = pedir(EstadoPlatillo.EN_PREPARACION, 1);
        anular(enCocina, platoAnulado.getId(), tokenAlmacenero).andExpect(status().isForbidden());

        assertThat(mermaRepository.findAll()).isEmpty();
    }

    @Test
    void deOtroRestaurante_Responde404() throws Exception {
        PedidoDetalle detalle = pedir(EstadoPlatillo.EN_PREPARACION, 1);

        anular(detalle, platoAnulado.getId(), tokenOtroRestaurante).andExpect(status().isNotFound());

        assertThat(mermaRepository.findAll()).isEmpty();
    }

    @Test
    void pedidoCerrado_Responde409() throws Exception {
        PedidoDetalle detalle = pedir(EstadoPlatillo.EN_PREPARACION, 1);
        detalle.getPedido().setEstado(EstadoPedido.CERRADO);
        entityManager.flush();

        anular(detalle, platoAnulado.getId(), tokenCocinero).andExpect(status().isConflict());

        assertThat(mermaRepository.findAll()).isEmpty();
    }
}
