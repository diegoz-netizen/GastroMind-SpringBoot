package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.entity.Categoria;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.EstadoPedido;
import com.gastromind.backendspring.entity.EstadoPlatillo;
import com.gastromind.backendspring.entity.Mesa;
import com.gastromind.backendspring.entity.Pedido;
import com.gastromind.backendspring.entity.PedidoDetalle;
import com.gastromind.backendspring.entity.Producto;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
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
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base de pedidos de punta a punta (H2): crear un pedido (CA-09) y llevar cada platillo de PENDIENTE a SERVIDO.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PedidoIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private final Map<String, Rol> roles = new HashMap<>();
    private Restaurante restaurante;
    private Empleado mozo;
    private String tokenMozo;
    private String tokenCocinero;
    private String tokenAlmacenero;
    private String tokenOtroRestaurante;
    private Mesa mesa;
    private Mesa mesaOtroRestaurante;
    private Producto lomo;
    private Producto chicha;
    private Producto productoOtroRestaurante;

    @BeforeEach
    void setUp() {
        restaurante = persistir(Restaurante.builder().nombre("Central").build());
        Restaurante otro = persistir(Restaurante.builder().nombre("Norte").build());
        mozo = empleado(restaurante, "MOZO", "mozo@test.com");
        tokenMozo = token(mozo);
        tokenCocinero = token(empleado(restaurante, "COCINERO", "cocina@test.com"));
        tokenAlmacenero = token(empleado(restaurante, "ALMACENERO", "almacen@test.com"));
        tokenOtroRestaurante = token(empleado(otro, "MOZO", "mozo@norte.com"));
        mesa = persistir(Mesa.builder().restaurante(restaurante).numero(1).build());
        mesaOtroRestaurante = persistir(Mesa.builder().restaurante(otro).numero(1).build());
        Categoria platos = persistir(Categoria.builder().restaurante(restaurante).nombre("Platos").build());
        Categoria platosOtro = persistir(Categoria.builder().restaurante(otro).nombre("Platos").build());
        lomo = producto(platos, "Lomo saltado");
        chicha = producto(platos, "Chicha");
        productoOtroRestaurante = producto(platosOtro, "Ceviche");
        entityManager.flush();
    }

    private <T> T persistir(T entidad) {
        entityManager.persist(entidad);
        return entidad;
    }

    private Empleado empleado(Restaurante deRestaurante, String nombreRol, String correo) {
        Rol rol = roles.computeIfAbsent(nombreRol, nombre -> persistir(Rol.builder().nombre(nombre).build()));
        return persistir(Empleado.builder().restaurante(deRestaurante).rol(rol)
                .nombreCompleto(nombreRol).correo(correo).passwordHash("hash").build());
    }

    private Producto producto(Categoria categoria, String nombre) {
        return persistir(Producto.builder().categoria(categoria).nombre(nombre)
                .precio(new BigDecimal("25.00")).build());
    }

    private String token(Empleado empleado) {
        return "Bearer " + jwtTokenProvider.generarToken(empleado);
    }

    private ResultActions crear(String cuerpo, String autorizacion) throws Exception {
        var peticion = post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(cuerpo);
        if (autorizacion != null) {
            peticion.header("Authorization", autorizacion);
        }
        return mockMvc.perform(peticion);
    }

    private String cuerpo(Long mesaId, Long productoId, int cantidad) {
        return "{\"mesaId\":" + mesaId + ",\"items\":[{\"productoId\":" + productoId + ",\"cantidad\":" + cantidad + "}]}";
    }

    private ResultActions cambiar(Long pedidoId, Long detalleId, String estado, String autorizacion) throws Exception {
        return mockMvc.perform(patch("/api/pedidos/" + pedidoId + "/detalles/" + detalleId + "/estado")
                .header("Authorization", autorizacion)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"" + estado + "\"}"));
    }

    // Pedido con el lomo y la chicha, los dos PENDIENTE
    private Pedido pedidoConDosPlatillos() {
        Pedido pedido = Pedido.builder().mesa(mesa).empleado(mozo).build();
        pedido.getDetalles().add(PedidoDetalle.builder().pedido(pedido).producto(lomo).cantidad(1).build());
        pedido.getDetalles().add(PedidoDetalle.builder().pedido(pedido).producto(chicha).cantidad(2).build());
        mesa.setEstado(Mesa.OCUPADA);
        entityManager.persist(pedido);
        entityManager.flush();
        return pedido;
    }

    @Test
    void crear_DeberiaGuardarElPedidoYOcuparLaMesa() throws Exception {
        crear(cuerpo(mesa.getId(), lomo.getId(), 2), tokenMozo)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mesaId").value(mesa.getId()))
                .andExpect(jsonPath("$.mesaNumero").value(1))
                .andExpect(jsonPath("$.empleadoId").value(mozo.getId()))
                .andExpect(jsonPath("$.estado").value("ABIERTO"))
                .andExpect(jsonPath("$.fechaRegistro").exists())
                .andExpect(jsonPath("$.detalles[0].producto").value("Lomo saltado"))
                .andExpect(jsonPath("$.detalles[0].cantidad").value(2))
                .andExpect(jsonPath("$.detalles[0].estado").value("PENDIENTE"));
        entityManager.flush();
        entityManager.clear();
        assertThat(entityManager.find(Mesa.class, mesa.getId()).getEstado()).isEqualTo(Mesa.OCUPADA);
    }

    @Test
    void crear_DatosInvalidos_DeberiaResponder400() throws Exception {
        crear("{\"mesaId\":" + mesa.getId() + ",\"items\":[]}", tokenMozo).andExpect(status().isBadRequest());
        crear("{\"items\":[{\"productoId\":" + lomo.getId() + ",\"cantidad\":1}]}", tokenMozo)
                .andExpect(status().isBadRequest());
        crear(cuerpo(mesa.getId(), lomo.getId(), 0), tokenMozo).andExpect(status().isBadRequest());
        crear("{\"mesaId\":" + mesa.getId() + ",\"items\":[{\"cantidad\":1}]}", tokenMozo)
                .andExpect(status().isBadRequest());
        crear("{\"mesaId\":" + mesa.getId() + ",\"items\":[null]}", tokenMozo).andExpect(status().isBadRequest());
        String repetido = "{\"productoId\":" + lomo.getId() + ",\"cantidad\":1}";
        crear("{\"mesaId\":" + mesa.getId() + ",\"items\":[" + repetido + "," + repetido + "]}", tokenMozo)
                .andExpect(status().isBadRequest());
        assertThat(mesa.getEstado()).isEqualTo(Mesa.LIBRE);
    }

    @Test
    void crear_SinTokenOConOtroRol_DeberiaRechazarse() throws Exception {
        crear(cuerpo(mesa.getId(), lomo.getId(), 1), null).andExpect(status().isUnauthorized());
        crear(cuerpo(mesa.getId(), lomo.getId(), 1), tokenCocinero).andExpect(status().isForbidden());
        crear(cuerpo(mesa.getId(), lomo.getId(), 1), tokenAlmacenero).andExpect(status().isForbidden());
    }

    @Test
    void crear_MesaOPlatilloDeOtroRestaurante_DeberiaResponder404() throws Exception {
        crear(cuerpo(mesaOtroRestaurante.getId(), lomo.getId(), 1), tokenMozo).andExpect(status().isNotFound());
        crear(cuerpo(mesa.getId(), productoOtroRestaurante.getId(), 1), tokenMozo).andExpect(status().isNotFound());
    }

    @Test
    void crear_MesaOcupadaOPlatilloInactivo_DeberiaResponder409() throws Exception {
        lomo.setEstado("INACTIVO");
        entityManager.flush();
        crear(cuerpo(mesa.getId(), lomo.getId(), 1), tokenMozo).andExpect(status().isConflict());

        mesa.setEstado(Mesa.OCUPADA);
        entityManager.flush();
        crear(cuerpo(mesa.getId(), chicha.getId(), 1), tokenMozo).andExpect(status().isConflict());
    }

    @Test
    void cambiarEstado_FlujoCompleto_DeberiaLlevarElPedidoHastaServido() throws Exception {
        Pedido pedido = pedidoConDosPlatillos();
        Long plato1 = pedido.getDetalles().get(0).getId();
        Long plato2 = pedido.getDetalles().get(1).getId();

        cambiar(pedido.getId(), plato1, "EN_PREPARACION", tokenCocinero)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("EN_PREPARACION"))
                .andExpect(jsonPath("$.detalles[0].estado").value("EN_PREPARACION"))
                .andExpect(jsonPath("$.detalles[1].estado").value("PENDIENTE"));
        cambiar(pedido.getId(), plato1, "LISTO", tokenCocinero).andExpect(status().isOk());
        cambiar(pedido.getId(), plato1, "SERVIDO", tokenMozo)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("EN_PREPARACION"));

        cambiar(pedido.getId(), plato2, "EN_PREPARACION", tokenCocinero).andExpect(status().isOk());
        cambiar(pedido.getId(), plato2, "LISTO", tokenCocinero).andExpect(status().isOk());
        cambiar(pedido.getId(), plato2, "SERVIDO", tokenMozo)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("SERVIDO"));
    }

    @Test
    void cambiarEstado_AnuladoNoCuentaParaElPedido() throws Exception {
        Pedido pedido = pedidoConDosPlatillos();
        PedidoDetalle plato1 = pedido.getDetalles().get(0);
        Long plato2 = pedido.getDetalles().get(1).getId();
        plato1.setEstado(EstadoPlatillo.LISTO);
        pedido.setEstado(EstadoPedido.EN_PREPARACION);
        entityManager.flush();

        cambiar(pedido.getId(), plato2, "ANULADO", tokenMozo).andExpect(status().isOk());
        cambiar(pedido.getId(), plato1.getId(), "SERVIDO", tokenMozo)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("SERVIDO"));
    }

    @Test
    void cambiarEstado_SaltoDeEstadoOYaAnulado_DeberiaResponder409() throws Exception {
        Pedido pedido = pedidoConDosPlatillos();
        PedidoDetalle plato = pedido.getDetalles().get(0);

        cambiar(pedido.getId(), plato.getId(), "SERVIDO", tokenMozo).andExpect(status().isConflict());

        // Lo que ya entró a cocina no se anula aquí: es una merma de la HU-18
        plato.setEstado(EstadoPlatillo.EN_PREPARACION);
        entityManager.flush();
        cambiar(pedido.getId(), plato.getId(), "ANULADO", tokenMozo).andExpect(status().isConflict());

        plato.setEstado(EstadoPlatillo.ANULADO);
        entityManager.flush();
        cambiar(pedido.getId(), plato.getId(), "EN_PREPARACION", tokenCocinero).andExpect(status().isConflict());
    }

    @Test
    void cambiarEstado_RolQueNoLeToca_DeberiaResponder403() throws Exception {
        Pedido pedido = pedidoConDosPlatillos();
        PedidoDetalle plato = pedido.getDetalles().get(0);

        cambiar(pedido.getId(), plato.getId(), "EN_PREPARACION", tokenMozo).andExpect(status().isForbidden());
        cambiar(pedido.getId(), plato.getId(), "ANULADO", tokenCocinero).andExpect(status().isForbidden());
        cambiar(pedido.getId(), plato.getId(), "EN_PREPARACION", tokenAlmacenero).andExpect(status().isForbidden());

        plato.setEstado(EstadoPlatillo.LISTO);
        entityManager.flush();
        cambiar(pedido.getId(), plato.getId(), "SERVIDO", tokenCocinero).andExpect(status().isForbidden());
    }

    @Test
    void cambiarEstado_DeOtroRestauranteOPlatilloDeOtroPedido_DeberiaResponder404() throws Exception {
        Pedido pedido = pedidoConDosPlatillos();
        Long plato = pedido.getDetalles().get(0).getId();

        cambiar(pedido.getId(), plato, "ANULADO", tokenOtroRestaurante).andExpect(status().isNotFound());
        cambiar(pedido.getId(), 999_999L, "ANULADO", tokenMozo).andExpect(status().isNotFound());
    }

    @Test
    void cambiarEstado_EstadoInvalidoOPedidoCerrado_DeberiaRechazarse() throws Exception {
        Pedido pedido = pedidoConDosPlatillos();
        Long plato = pedido.getDetalles().get(0).getId();

        cambiar(pedido.getId(), plato, "QUEMADO", tokenCocinero).andExpect(status().isBadRequest());
        cambiar(pedido.getId(), plato, " ", tokenCocinero).andExpect(status().isBadRequest());

        pedido.setEstado(EstadoPedido.CERRADO);
        entityManager.flush();
        cambiar(pedido.getId(), plato, "EN_PREPARACION", tokenCocinero).andExpect(status().isConflict());
    }
}
