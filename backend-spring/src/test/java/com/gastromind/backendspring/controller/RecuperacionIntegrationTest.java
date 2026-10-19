package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.exception.CodigoError;
import com.gastromind.backendspring.service.CorreoService;
import com.gastromind.backendspring.service.LimiteSolicitudes;
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
import org.springframework.transaction.annotation.Transactional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HU-04 de punta a punta (H2): pedir el enlace → restablecer → login con la clave nueva;
 * el mismo enlace no sirve dos veces (CA-04) y la respuesta no revela si el correo existe.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RecuperacionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private CorreoService correoService;

    @Autowired
    private LimiteSolicitudes limite;

    @BeforeEach
    void setUp() {
        limite.limpiar();
        Restaurante restaurante = Restaurante.builder().nombre("Restaurante Test").build();
        Rol mozo = Rol.builder().nombre("MOZO").build();
        entityManager.persist(restaurante);
        entityManager.persist(mozo);
        entityManager.persist(Empleado.builder().restaurante(restaurante).rol(mozo)
                .nombreCompleto("Ana Mozo").correo("ana@test.com")
                .passwordHash(passwordEncoder.encode("vieja123")).estado("ACTIVO").build());
        entityManager.flush();
    }

    private String pedirEnlaceYLeerToken() throws Exception {
        mockMvc.perform(post("/api/auth/recuperar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"ana@test.com\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<String> cuerpo = ArgumentCaptor.forClass(String.class);
        verify(correoService).enviar(eq("ana@test.com"), anyString(), cuerpo.capture());
        return cuerpo.getValue().split("token=")[1].split("\\s")[0];
    }

    private void restablecer(String token, int estadoEsperado) throws Exception {
        mockMvc.perform(post("/api/auth/restablecer").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"nuevaContrasena\":\"nueva123\"}"))
                .andExpect(status().is(estadoEsperado));
    }

    private void login(String password, int estadoEsperado) throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"ana@test.com\",\"password\":\"" + password + "\"}"))
                .andExpect(status().is(estadoEsperado));
    }

    @Test
    void flujoCompleto_DeberiaCambiarLaContrasena() throws Exception {
        String token = pedirEnlaceYLeerToken();

        restablecer(token, 200);

        login("nueva123", 200);
        login("vieja123", 401);
    }

    @Test
    void elMismoEnlaceDosVeces_ElSegundoDeberiaFallar() throws Exception {
        String token = pedirEnlaceYLeerToken();

        restablecer(token, 200);
        restablecer(token, 400);
    }

    @Test
    void pedirOtroEnlace_DeberiaAnularElAnterior() throws Exception {
        String primero = pedirEnlaceYLeerToken();
        reset(correoService);
        String segundo = pedirEnlaceYLeerToken();

        restablecer(primero, 400);
        restablecer(segundo, 200);
    }

    @Test
    void correoInexistente_DeberiaResponderLoMismoSinEnviarNada() throws Exception {
        mockMvc.perform(post("/api/auth/recuperar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"nadie@test.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value(RecuperacionController.MENSAJE_SOLICITUD));

        verifyNoInteractions(correoService);
    }

    private String loginYLeerJwt(String password) throws Exception {
        String respuesta = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"ana@test.com\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return respuesta.split("\"token\":\"")[1].split("\"")[0];
    }

    // Ana es MOZO: con un JWT válido /api/empleados responde 403 (autenticada, sin permiso); con uno inválido, 401
    private void usarJwt(String jwt, int estadoEsperado) throws Exception {
        mockMvc.perform(get("/api/empleados").header("Authorization", "Bearer " + jwt))
                .andExpect(status().is(estadoEsperado));
    }

    @Test
    void cambiarLaContrasena_DeberiaInvalidarLosJwtAnteriores() throws Exception {
        String jwtViejo = loginYLeerJwt("vieja123");
        usarJwt(jwtViejo, 403);

        restablecer(pedirEnlaceYLeerToken(), 200);

        usarJwt(jwtViejo, 401);
        usarJwt(loginYLeerJwt("nueva123"), 403);
    }

    @Test
    void contrasenaCorta_DeberiaResponder400() throws Exception {
        String token = pedirEnlaceYLeerToken();

        mockMvc.perform(post("/api/auth/restablecer").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"nuevaContrasena\":\"123\"}"))
                .andExpect(status().isBadRequest());
        login("vieja123", 200);
    }

    // HL-035: el límite responde igual exista o no el correo, para no revelar cuáles están registrados
    @Test
    void cuartaSolicitudDelMismoCorreo_DeberiaResponder429() throws Exception {
        for (String correo : new String[]{"ana@test.com", "nadie@test.com"}) {
            for (int i = 0; i < 3; i++) {
                mockMvc.perform(post("/api/auth/recuperar").contentType(MediaType.APPLICATION_JSON)
                                .content("{\"correo\":\"" + correo + "\"}"))
                        .andExpect(status().isOk());
            }
            mockMvc.perform(post("/api/auth/recuperar").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"correo\":\"" + correo + "\"}"))
                    .andExpect(status().isTooManyRequests())
                    .andExpect(jsonPath("$.error").value(CodigoError.DEMASIADAS_SOLICITUDES))
                    .andExpect(jsonPath("$.mensaje").isString());
        }
        verify(correoService, times(3)).enviar(eq("ana@test.com"), anyString(), anyString());
    }
}
