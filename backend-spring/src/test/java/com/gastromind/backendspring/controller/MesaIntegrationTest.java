package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Mesa;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.security.JwtTokenProvider;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/mesas (H2): el mozo ve solo las mesas de su restaurante, en orden de número, con su estado.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MesaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private final Map<String, Rol> roles = new HashMap<>();
    private String tokenMozo;
    private String tokenAdministrador;
    private String tokenCocinero;
    private Mesa mesaOcupada;

    @BeforeEach
    void setUp() {
        Restaurante central = persistir(Restaurante.builder().nombre("Central").build());
        Restaurante norte = persistir(Restaurante.builder().nombre("Norte").build());
        tokenMozo = token(empleado(central, "MOZO", "mozo@test.com"));
        tokenAdministrador = token(empleado(central, "ADMINISTRADOR", "admin@test.com"));
        tokenCocinero = token(empleado(central, "COCINERO", "cocina@test.com"));
        // Se guardan desordenadas a propósito: la respuesta debe salir ordenada por número
        mesaOcupada = persistir(Mesa.builder().restaurante(central).numero(2).build());
        mesaOcupada.setEstado(Mesa.OCUPADA);
        persistir(Mesa.builder().restaurante(central).numero(1).build());
        persistir(Mesa.builder().restaurante(norte).numero(7).build());
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

    private String token(Empleado empleado) {
        return "Bearer " + jwtTokenProvider.generarToken(empleado);
    }

    @Test
    void listar_DeberiaDevolverSoloLasMesasDelRestauranteDelTokenOrdenadasPorNumero() throws Exception {
        mockMvc.perform(get("/api/mesas").header("Authorization", tokenMozo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].numero").value(1))
                .andExpect(jsonPath("$[0].estado").value("LIBRE"))
                .andExpect(jsonPath("$[1].id").value(mesaOcupada.getId()))
                .andExpect(jsonPath("$[1].numero").value(2))
                .andExpect(jsonPath("$[1].estado").value("OCUPADA"));
    }

    @Test
    void listar_DeberiaPermitirleLaLecturaAlAdministrador() throws Exception {
        mockMvc.perform(get("/api/mesas").header("Authorization", tokenAdministrador))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void listar_DeberiaRechazarUnRolQueNoTomaPedidos() throws Exception {
        mockMvc.perform(get("/api/mesas").header("Authorization", tokenCocinero))
                .andExpect(status().isForbidden());
    }

    @Test
    void listar_DeberiaExigirAutenticacion() throws Exception {
        mockMvc.perform(get("/api/mesas"))
                .andExpect(status().isUnauthorized());
    }
}
