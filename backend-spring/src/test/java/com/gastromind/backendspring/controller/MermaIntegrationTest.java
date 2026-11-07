package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.MotivoMerma;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HU-17 de punta a punta (H2): el almacenero registra la merma con su JWT; sin motivo o con una cantidad
 * inválida la API responde 400 antes de tocar la BD.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MermaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String token;
    private Ingrediente arroz;
    private MotivoMerma quemado;

    @BeforeEach
    void setUp() {
        Restaurante restaurante = Restaurante.builder().nombre("Restaurante Test").build();
        Rol rol = Rol.builder().nombre("ALMACENERO").build();
        entityManager.persist(restaurante);
        entityManager.persist(rol);
        Empleado almacenero = Empleado.builder().restaurante(restaurante).rol(rol)
                .nombreCompleto("Luis Almacén").correo("luis@test.com").passwordHash("hash").build();
        entityManager.persist(almacenero);
        arroz = Ingrediente.builder().restaurante(restaurante).nombre("Arroz").unidadMedida("kg")
                .stockActual(new BigDecimal("5.000")).costoUnitario(new BigDecimal("4.50")).build();
        entityManager.persist(arroz);
        quemado = MotivoMerma.builder().nombre("QUEMADO").esGlobal(true).build();
        entityManager.persist(quemado);
        entityManager.flush();
        token = "Bearer " + jwtTokenProvider.generarToken(almacenero);
    }

    private ResultActions registrar(String cuerpo, String autorizacion) throws Exception {
        var peticion = post("/api/mermas").contentType(MediaType.APPLICATION_JSON).content(cuerpo);
        if (autorizacion != null) {
            peticion.header("Authorization", autorizacion);
        }
        return mockMvc.perform(peticion);
    }

    private String cuerpo(String cantidad, Long motivoId) {
        return "{\"ingredienteId\":" + arroz.getId() + ",\"cantidad\":" + cantidad
                + (motivoId == null ? "" : ",\"motivoId\":" + motivoId) + "}";
    }

    @Test
    void registrar_Responde201_ConElStockQueQuedo() throws Exception {
        registrar(cuerpo("0.75", quemado.getId()), token)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.insumo").value("Arroz"))
                .andExpect(jsonPath("$.motivo").value("QUEMADO"))
                .andExpect(jsonPath("$.stockDespues").value(4.25))
                .andExpect(jsonPath("$.costo").value(3.38))
                .andExpect(jsonPath("$.registradoPor").value("Luis Almacén"));
    }

    @Test
    void sinMotivo_Responde400() throws Exception {
        registrar(cuerpo("1", null), token).andExpect(status().isBadRequest());
    }

    @Test
    void cantidadCeroOConCuatroDecimales_Responde400() throws Exception {
        registrar(cuerpo("0", quemado.getId()), token).andExpect(status().isBadRequest());
        registrar(cuerpo("0.0005", quemado.getId()), token).andExpect(status().isBadRequest());
    }

    @Test
    void sinToken_Responde401() throws Exception {
        registrar(cuerpo("1", quemado.getId()), null).andExpect(status().isUnauthorized());
    }

    @Test
    void motivos_TraeLosGlobales() throws Exception {
        mockMvc.perform(get("/api/mermas/motivos").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nombre").value("QUEMADO"));
    }
}
