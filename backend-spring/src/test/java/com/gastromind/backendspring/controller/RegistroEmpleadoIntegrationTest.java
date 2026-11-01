package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.security.JwtTokenProvider;
import com.gastromind.backendspring.service.CorreoService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HU-01-b de punta a punta (H2): el admin registra → el correo trae el enlace, sin contraseña ni PIN →
 * el empleado crea su contraseña con el enlace → inicia sesión. El PIN solo se ve en la respuesta del registro.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RegistroEmpleadoIntegrationTest {

    private static final String NUEVO = "luis@test.com";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private CorreoService correoService;

    private Empleado admin;
    private Rol rolMozo;

    @BeforeEach
    void setUp() {
        Restaurante restaurante = Restaurante.builder().nombre("Restaurante Test").build();
        Rol rolAdmin = Rol.builder().nombre("ADMINISTRADOR").build();
        rolMozo = Rol.builder().nombre("MOZO").build();
        entityManager.persist(restaurante);
        entityManager.persist(rolAdmin);
        entityManager.persist(rolMozo);
        admin = Empleado.builder().restaurante(restaurante).rol(rolAdmin).nombreCompleto("Admin")
                .correo("admin@test.com").passwordHash(passwordEncoder.encode("Clave2026!")).estado("ACTIVO").build();
        entityManager.persist(admin);
        entityManager.flush();
    }

    private ResultActions registrar(String pin) throws Exception {
        String campoPin = pin == null ? "" : ",\"pinAcceso\":\"" + pin + "\"";
        return mockMvc.perform(post("/api/empleados")
                .header("Authorization", "Bearer " + jwtTokenProvider.generarToken(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreCompleto\":\"Luis Mozo\",\"correo\":\"" + NUEVO + "\",\"rolId\":"
                        + rolMozo.getId() + campoPin + "}"));
    }

    private String correoDeBienvenida() {
        ArgumentCaptor<String> cuerpo = ArgumentCaptor.forClass(String.class);
        verify(correoService).enviar(eq(NUEVO), anyString(), cuerpo.capture());
        return cuerpo.getValue();
    }

    private static String tokenDe(String correo) {
        return correo.split("token=")[1].split("[&\\s]")[0];
    }

    private void crearContrasena(String token, int estadoEsperado) throws Exception {
        mockMvc.perform(post("/api/auth/restablecer").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"nuevaContrasena\":\"MiClave2026\"}"))
                .andExpect(status().is(estadoEsperado));
    }

    @Test
    void flujoCompleto_ElEmpleadoCreaSuContrasenaConElEnlaceEInicia() throws Exception {
        registrar(null).andExpect(status().isCreated());

        crearContrasena(tokenDe(correoDeBienvenida()), 200);

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"" + NUEVO + "\",\"password\":\"MiClave2026\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString());
    }

    @Test
    void elCorreoTraeElEnlaceDeBienvenidaYNoElPin() throws Exception {
        registrar("4821").andExpect(status().isCreated()).andExpect(jsonPath("$.pinAcceso").value("4821"));

        String correo = correoDeBienvenida();
        assertTrue(correo.contains("bienvenida=1"));
        assertFalse(correo.contains("4821"));
    }

    @Test
    void sinPin_LaRespuestaTraeUnoGeneradoDe4Digitos() throws Exception {
        registrar(null).andExpect(status().isCreated())
                .andExpect(jsonPath("$.pinAcceso").value(org.hamcrest.Matchers.matchesPattern("\\d{4}")))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void elEnlaceDeBienvenidaSirveUnaSolaVez() throws Exception {
        registrar(null).andExpect(status().isCreated());
        String token = tokenDe(correoDeBienvenida());

        crearContrasena(token, 200);
        crearContrasena(token, 400);
    }

    @Test
    void pinQueNoEsDe4Digitos_400() throws Exception {
        for (String pin : new String[]{"123", "12345", "12a4", ""}) {
            registrar(pin).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.campos.pinAcceso").value("El PIN debe tener 4 dígitos"));
        }
    }
}
