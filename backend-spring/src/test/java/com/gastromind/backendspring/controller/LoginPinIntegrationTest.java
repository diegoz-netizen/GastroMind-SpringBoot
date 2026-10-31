package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.service.LimiteSolicitudes;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HU-27 de punta a punta (H2): correo + PIN → el mismo JWT del login web; un dato equivocado no dice cuál falló;
 * el administrador no entra con PIN; tras 5 fallos por correo, 429.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LoginPinIntegrationTest {

    private static final String CREDENCIALES = "Credenciales inválidas";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LimiteSolicitudes limite;

    @BeforeEach
    void setUp() {
        limite.limpiar();
        Restaurante restaurante = Restaurante.builder().nombre("Restaurante Test").build();
        Rol mozo = Rol.builder().nombre("MOZO").build();
        Rol admin = Rol.builder().nombre("ADMINISTRADOR").build();
        entityManager.persist(restaurante);
        entityManager.persist(mozo);
        entityManager.persist(admin);
        empleado(restaurante, mozo, "ana@test.com", "4821", "ACTIVO");
        empleado(restaurante, mozo, "inactivo@test.com", "4821", "INACTIVO");
        empleado(restaurante, mozo, "sinpin@test.com", null, "ACTIVO");
        empleado(restaurante, admin, "admin@test.com", "4821", "ACTIVO");
        entityManager.flush();
    }

    private void empleado(Restaurante restaurante, Rol rol, String correo, String pin, String estado) {
        entityManager.persist(Empleado.builder().restaurante(restaurante).rol(rol).nombreCompleto(correo)
                .correo(correo).passwordHash(passwordEncoder.encode("Clave2026!"))
                .pinAcceso(pin == null ? null : passwordEncoder.encode(pin)).estado(estado).build());
    }

    private ResultActions loginPin(String correo, String pin) throws Exception {
        return mockMvc.perform(post("/api/auth/login-pin").contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"" + correo + "\",\"pin\":\"" + pin + "\"}"));
    }

    private void credencialesInvalidas(String correo, String pin) throws Exception {
        loginPin(correo, pin).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.mensaje").value(CREDENCIALES));
    }

    @Test
    void correoYPinCorrectos_DevuelveElMismoJwtQueElLoginWeb() throws Exception {
        String respuesta = loginPin("ana@test.com", "4821").andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("MOZO"))
                .andExpect(jsonPath("$.correo").value("ana@test.com"))
                .andReturn().getResponse().getContentAsString();
        String jwt = respuesta.split("\"token\":\"")[1].split("\"")[0];

        // Ana es MOZO: el token vale (403 = autenticada sin permiso, no 401)
        mockMvc.perform(get("/api/empleados").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isForbidden());
    }

    @Test
    void pinIncorrecto_CorreoInexistenteOSinPin_RespondenLoMismo() throws Exception {
        credencialesInvalidas("ana@test.com", "1111");
        credencialesInvalidas("nadie@test.com", "4821");
        credencialesInvalidas("sinpin@test.com", "4821");
    }

    @Test
    void correoInexistente_TambienComparaElPin() throws Exception {
        // Si no corriera BCrypt, el 401 de un correo inexistente saldría mucho más rápido y lo delataría
        long inicio = System.nanoTime();
        credencialesInvalidas("nadie@test.com", "4821");
        long sinCorreo = System.nanoTime() - inicio;
        inicio = System.nanoTime();
        credencialesInvalidas("ana@test.com", "1111");
        long pinIncorrecto = System.nanoTime() - inicio;
        org.junit.jupiter.api.Assertions.assertTrue(sinCorreo * 3 > pinIncorrecto,
                "sin correo: " + sinCorreo / 1_000_000 + " ms, PIN incorrecto: " + pinIncorrecto / 1_000_000 + " ms");
    }

    @Test
    void elAdministradorNoEntraConPin() throws Exception {
        credencialesInvalidas("admin@test.com", "4821");
    }

    @Test
    void cuentaInactiva_SoloLoDiceConElPinCorrecto() throws Exception {
        credencialesInvalidas("inactivo@test.com", "1111");
        loginPin("inactivo@test.com", "4821").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Su cuenta se encuentra inactiva. Contacte al administrador."));
    }

    @Test
    void pinQueNoEsDe4Digitos_400() throws Exception {
        loginPin("ana@test.com", "12a4").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.pin").value("El PIN debe tener 4 dígitos"));
    }

    @Test
    void cincoFallos_BloqueanElCorreoAunqueDespuesElPinSeaCorrecto() throws Exception {
        for (int i = 0; i < 5; i++) {
            credencialesInvalidas("ana@test.com", "000" + i);
        }
        loginPin("ana@test.com", "4821").andExpect(status().isTooManyRequests());
        // Otro correo de la misma IP sigue entrando (el límite por IP es más alto)
        credencialesInvalidas("nadie@test.com", "4821");
    }

    @Test
    void entrarBienVariasVeces_NoBloquea() throws Exception {
        for (int i = 0; i < 8; i++) {
            loginPin("ana@test.com", "4821").andExpect(status().isOk());
        }
    }
}
