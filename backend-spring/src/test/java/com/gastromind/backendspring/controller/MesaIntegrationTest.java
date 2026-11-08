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
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/mesas (H2): el mozo ve solo las mesas de su restaurante, en orden de número, con su estado.
 * HU-26: POST y PUT /api/mesas, el administrador registra y edita número, capacidad y zona.
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
    private Mesa mesaLibre;
    private Mesa mesaDeNorte;

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
        mesaLibre = persistir(Mesa.builder().restaurante(central).numero(1).build());
        mesaDeNorte = persistir(Mesa.builder().restaurante(norte).numero(7).build());
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
                .andExpect(jsonPath("$[0].capacidad").value(4))
                .andExpect(jsonPath("$[0].zona").value("Salón"))
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

    private static String mesa(Object numero, Object capacidad, String zona) {
        return "{\"numero\": " + numero + ", \"capacidad\": " + capacidad + ", \"zona\": "
                + (zona == null ? "null" : "\"" + zona + "\"") + "}";
    }

    // ---------- HU-26: crear ----------

    @Test
    void crear_DeberiaRegistrarLaMesaLibreEnElRestauranteDelToken() throws Exception {
        mockMvc.perform(post("/api/mesas").header("Authorization", tokenAdministrador)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(9, 6, "  Terraza  ")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.numero").value(9))
                .andExpect(jsonPath("$.capacidad").value(6))
                .andExpect(jsonPath("$.zona").value("Terraza"))
                .andExpect(jsonPath("$.estado").value("LIBRE"));

        mockMvc.perform(get("/api/mesas").header("Authorization", tokenMozo))
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[2].numero").value(9));
    }

    @Test
    void crear_DeberiaRechazarUnNumeroRepetidoEnElMismoRestaurante() throws Exception {
        mockMvc.perform(post("/api/mesas").header("Authorization", tokenAdministrador)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(1, 4, "Salón")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Ya existe la mesa 1"));
    }

    @Test
    void crear_DeberiaPermitirElMismoNumeroQueOtroRestaurante() throws Exception {
        // La 7 existe en Norte, no en Central
        mockMvc.perform(post("/api/mesas").header("Authorization", tokenAdministrador)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(7, 4, "Salón")))
                .andExpect(status().isCreated());
    }

    @Test
    void crear_DeberiaValidarNumeroCapacidadYZona() throws Exception {
        mockMvc.perform(post("/api/mesas").header("Authorization", tokenAdministrador)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(0, 31, " ")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.numero").value("El número debe ser mayor que 0"))
                .andExpect(jsonPath("$.campos.capacidad").value("La capacidad máxima es de 30 personas"))
                .andExpect(jsonPath("$.campos.zona").value("La zona es obligatoria"));

        mockMvc.perform(post("/api/mesas").header("Authorization", tokenAdministrador)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa("null", 0, "x".repeat(31))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.numero").value("El número es obligatorio"))
                .andExpect(jsonPath("$.campos.capacidad").value("La capacidad debe ser de al menos 1 persona"))
                .andExpect(jsonPath("$.campos.zona").value("La zona admite hasta 30 caracteres"));
    }

    @Test
    void crear_DeberiaSerSoloDelAdministrador() throws Exception {
        mockMvc.perform(post("/api/mesas").header("Authorization", tokenMozo)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(9, 4, "Salón")))
                .andExpect(status().isForbidden());
    }

    // ---------- HU-26: editar ----------

    @Test
    void editar_DeberiaCambiarNumeroCapacidadYZonaSinTocarElEstado() throws Exception {
        mockMvc.perform(put("/api/mesas/" + mesaLibre.getId()).header("Authorization", tokenAdministrador)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(10, 2, "Barra")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.numero").value(10))
                .andExpect(jsonPath("$.capacidad").value(2))
                .andExpect(jsonPath("$.zona").value("Barra"))
                .andExpect(jsonPath("$.estado").value("LIBRE"));

        entityManager.clear();
        Mesa guardada = entityManager.find(Mesa.class, mesaLibre.getId());
        assertThat(guardada.getNumero()).isEqualTo(10);
        assertThat(guardada.getZona()).isEqualTo("Barra");
    }

    @Test
    void editar_DeberiaDejarCambiarCapacidadYZonaDeUnaMesaOcupada() throws Exception {
        mockMvc.perform(put("/api/mesas/" + mesaOcupada.getId()).header("Authorization", tokenAdministrador)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(2, 8, "Terraza")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.capacidad").value(8))
                .andExpect(jsonPath("$.estado").value("OCUPADA"));
    }

    @Test
    void editar_DeberiaRechazarCambiarElNumeroDeUnaMesaOcupada() throws Exception {
        mockMvc.perform(put("/api/mesas/" + mesaOcupada.getId()).header("Authorization", tokenAdministrador)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(20, 4, "Salón")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("La mesa 2 está ocupada: su número no se puede cambiar"));
    }

    @Test
    void editar_DeberiaRechazarElNumeroDeOtraMesaDelRestaurante() throws Exception {
        mockMvc.perform(put("/api/mesas/" + mesaLibre.getId()).header("Authorization", tokenAdministrador)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(2, 4, "Salón")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Ya existe la mesa 2"));
    }

    @Test
    void editar_DeberiaTratarComoInexistenteLaMesaDeOtroRestaurante() throws Exception {
        mockMvc.perform(put("/api/mesas/" + mesaDeNorte.getId()).header("Authorization", tokenAdministrador)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(7, 4, "Salón")))
                .andExpect(status().isNotFound());
    }

    @Test
    void editar_DeberiaSerSoloDelAdministrador() throws Exception {
        mockMvc.perform(put("/api/mesas/" + mesaLibre.getId()).header("Authorization", tokenMozo)
                        .contentType(MediaType.APPLICATION_JSON).content(mesa(1, 4, "Salón")))
                .andExpect(status().isForbidden());
    }
}
