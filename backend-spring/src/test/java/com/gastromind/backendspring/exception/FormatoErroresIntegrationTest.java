package com.gastromind.backendspring.exception;

import com.gastromind.backendspring.entity.Empleado;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HL-014: todos los errores salen como {error, mensaje, campos?} en JSON, nunca texto plano ni stack trace.
 * Levanta la aplicación real con H2 (perfil test).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FormatoErroresIntegrationTest {

    private static final String CLAVE = "Clave2026!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Empleado admin;
    private Empleado mozo;

    @BeforeEach
    void setUp() {
        Restaurante restaurante = Restaurante.builder().nombre("Restaurante Test").build();
        Rol rolAdmin = Rol.builder().nombre("ADMINISTRADOR").build();
        Rol rolMozo = Rol.builder().nombre("MOZO").build();
        entityManager.persist(restaurante);
        entityManager.persist(rolAdmin);
        entityManager.persist(rolMozo);

        admin = empleado(restaurante, rolAdmin, "admin@test.com", "ACTIVO");
        mozo = empleado(restaurante, rolMozo, "mozo@test.com", "ACTIVO");
        empleado(restaurante, rolMozo, "inactivo@test.com", "INACTIVO");
        entityManager.flush();
    }

    private Empleado empleado(Restaurante restaurante, Rol rol, String correo, String estado) {
        Empleado e = Empleado.builder().restaurante(restaurante).rol(rol).nombreCompleto(correo).correo(correo)
                .passwordHash(passwordEncoder.encode(CLAVE)).estado(estado).build();
        entityManager.persist(e);
        return e;
    }

    private String bearer(Empleado empleado) {
        return "Bearer " + jwtTokenProvider.generarToken(empleado);
    }

    private ResultActions login(String correo, String clave) throws Exception {
        return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"" + correo + "\",\"password\":\"" + clave + "\"}"));
    }

    /** Lo que deben cumplir todas las respuestas de error. */
    private static void formatoComun(ResultActions r, int status, String error) throws Exception {
        r.andExpect(status().is(status))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value(error))
                .andExpect(jsonPath("$.mensaje").isString())
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist());
    }

    // --- 401 ---

    @Test
    void loginConClaveIncorrecta_401EnJson() throws Exception {
        ResultActions r = login("admin@test.com", "otra");
        formatoComun(r, 401, CodigoError.NO_AUTENTICADO);
        r.andExpect(jsonPath("$.mensaje").value("Credenciales inválidas"))
                .andExpect(jsonPath("$.campos").doesNotExist());
    }

    @Test
    void loginDeCuentaInactiva_401ConSuMensaje() throws Exception {
        ResultActions r = login("inactivo@test.com", CLAVE);
        formatoComun(r, 401, CodigoError.NO_AUTENTICADO);
        r.andExpect(jsonPath("$.mensaje").value("Su cuenta se encuentra inactiva. Contacte al administrador."));
    }

    @Test
    void loginCorrecto_SigueDevolviendoElToken() throws Exception {
        login("admin@test.com", CLAVE).andExpect(status().isOk()).andExpect(jsonPath("$.token").isString());
    }

    @Test
    void rutaProtegidaSinToken_401EnJson() throws Exception {
        formatoComun(mockMvc.perform(get("/api/empleados")), 401, CodigoError.NO_AUTENTICADO);
    }

    @Test
    void rutaProtegidaConTokenInvalido_401EnJson() throws Exception {
        formatoComun(mockMvc.perform(get("/api/empleados").header("Authorization", "Bearer no-es-un-jwt")),
                401, CodigoError.NO_AUTENTICADO);
    }

    // --- 400 ---

    @Test
    void validacionDelDto_400ConUnMensajePorCampo() throws Exception {
        ResultActions r = mockMvc.perform(post("/api/empleados").header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreCompleto\":\"\",\"correo\":\"no-es-correo\",\"pinAcceso\":\"12a\"}"));
        formatoComun(r, 400, CodigoError.VALIDACION);
        r.andExpect(jsonPath("$.campos.nombreCompleto").isString())
                .andExpect(jsonPath("$.campos.correo").value("El formato del correo es inválido"))
                .andExpect(jsonPath("$.campos.rolId").isString())
                .andExpect(jsonPath("$.campos.pinAcceso").value("El PIN debe tener 4 dígitos"));
    }

    @Test
    void jsonMalFormado_400() throws Exception {
        formatoComun(mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{esto no es json")), 400, CodigoError.SOLICITUD_INVALIDA);
    }

    @Test
    void recuperarConCorreoInvalido_400DeValidacion() throws Exception {
        ResultActions r = mockMvc.perform(post("/api/auth/recuperar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"no-es-correo\"}"));
        formatoComun(r, 400, CodigoError.VALIDACION);
        r.andExpect(jsonPath("$.campos.correo").isString());
    }

    // --- 403, 404, 405, 409 ---

    @Test
    void mozoListandoEmpleados_403() throws Exception {
        ResultActions r = mockMvc.perform(get("/api/empleados").header("Authorization", bearer(mozo)));
        formatoComun(r, 403, CodigoError.SIN_PERMISO);
        r.andExpect(jsonPath("$.mensaje").value("Se requiere rol ADMINISTRADOR"));
    }

    @Test
    void empleadoQueNoExiste_404() throws Exception {
        ResultActions r = mockMvc.perform(patch("/api/empleados/999999/estado").header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"INACTIVO\"}"));
        formatoComun(r, 404, CodigoError.NO_ENCONTRADO);
    }

    @Test
    void rutaQueNoExiste_404() throws Exception {
        formatoComun(mockMvc.perform(get("/api/no-existe").header("Authorization", bearer(admin))),
                404, CodigoError.NO_ENCONTRADO);
    }

    @Test
    void metodoNoPermitido_405() throws Exception {
        formatoComun(mockMvc.perform(delete("/api/auth/login")), 405, CodigoError.METODO_NO_PERMITIDO);
    }

    @Test
    void adminDesactivandoseASiMismo_409() throws Exception {
        ResultActions r = mockMvc.perform(patch("/api/empleados/" + admin.getId() + "/estado")
                .header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"INACTIVO\"}"));
        formatoComun(r, 409, CodigoError.CONFLICTO);
        r.andExpect(jsonPath("$.mensaje").value("No puede desactivar su propia cuenta"));
    }
}
