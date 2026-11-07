package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.entity.ConteoCiclico;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HU-30 de punta a punta (H2): el almacenero registra el conteo físico y queda la diferencia con el sistema.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ConteoIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private Ingrediente arroz;
    private Ingrediente polloOtroRestaurante;
    private String almacenero;
    private String cocinero;

    @BeforeEach
    void setUp() {
        Restaurante restaurante = Restaurante.builder().nombre("Restaurante Test").build();
        Restaurante otro = Restaurante.builder().nombre("Otro").build();
        Rol rolAlmacen = Rol.builder().nombre("ALMACENERO").build();
        Rol rolCocina = Rol.builder().nombre("COCINERO").build();
        entityManager.persist(restaurante);
        entityManager.persist(otro);
        entityManager.persist(rolAlmacen);
        entityManager.persist(rolCocina);
        Empleado luis = Empleado.builder().restaurante(restaurante).rol(rolAlmacen)
                .nombreCompleto("Luis Almacén").correo("luis@test.com").passwordHash("hash").build();
        Empleado ana = Empleado.builder().restaurante(restaurante).rol(rolCocina)
                .nombreCompleto("Ana Cocina").correo("ana@test.com").passwordHash("hash").build();
        entityManager.persist(luis);
        entityManager.persist(ana);
        arroz = Ingrediente.builder().restaurante(restaurante).nombre("Arroz").unidadMedida("kg")
                .stockActual(new BigDecimal("12.500")).costoUnitario(new BigDecimal("3.80")).build();
        polloOtroRestaurante = Ingrediente.builder().restaurante(otro).nombre("Pollo").unidadMedida("kg")
                .stockActual(new BigDecimal("5.000")).costoUnitario(new BigDecimal("11.50")).build();
        entityManager.persist(arroz);
        entityManager.persist(polloOtroRestaurante);
        entityManager.flush();
        almacenero = "Bearer " + jwtTokenProvider.generarToken(luis);
        cocinero = "Bearer " + jwtTokenProvider.generarToken(ana);
    }

    private ResultActions contar(Long ingredienteId, String cantidad, String autorizacion) throws Exception {
        var peticion = post("/api/conteos").contentType(MediaType.APPLICATION_JSON)
                .content("{\"ingredienteId\":" + ingredienteId + ",\"cantidad\":" + cantidad + "}");
        if (autorizacion != null) {
            peticion.header("Authorization", autorizacion);
        }
        return mockMvc.perform(peticion);
    }

    @Test
    void registrar_GuardaLoContadoYLaDiferenciaConElSistema() throws Exception {
        contar(arroz.getId(), "11.8", almacenero)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.insumo").value("Arroz"))
                .andExpect(jsonPath("$.cantidadContada").value(11.8))
                .andExpect(jsonPath("$.stockSistema").value(12.5))
                .andExpect(jsonPath("$.diferencia").value(-0.7))
                .andExpect(jsonPath("$.fechaRegistro").isNotEmpty())
                .andExpect(jsonPath("$.registradoPor").value("Luis Almacén"));

        ConteoCiclico guardado = entityManager.createQuery("from ConteoCiclico", ConteoCiclico.class).getSingleResult();
        assertThat(guardado.getStockSistema()).isEqualByComparingTo("12.500");
        assertThat(guardado.getCantidadFisicaContada()).isEqualByComparingTo("11.800");
    }

    @Test
    void registrar_NoCambiaElStock() throws Exception {
        contar(arroz.getId(), "3", almacenero).andExpect(status().isCreated());
        entityManager.refresh(arroz);
        assertThat(arroz.getStockActual()).isEqualByComparingTo("12.500");
    }

    @Test
    void contarCero_EsValido() throws Exception {
        contar(arroz.getId(), "0", almacenero)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.diferencia").value(-12.5));
    }

    @Test
    void cantidadNegativaConCuatroDecimalesOSinCantidad_Responde400() throws Exception {
        contar(arroz.getId(), "-1", almacenero).andExpect(status().isBadRequest());
        contar(arroz.getId(), "1.0005", almacenero).andExpect(status().isBadRequest());
        contar(arroz.getId(), "null", almacenero)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.cantidad").exists());
    }

    @Test
    void insumoDeOtroRestaurante_Responde404() throws Exception {
        contar(polloOtroRestaurante.getId(), "1", almacenero).andExpect(status().isNotFound());
    }

    @Test
    void cocineroNoCuenta_YSinToken401() throws Exception {
        contar(arroz.getId(), "1", cocinero).andExpect(status().isForbidden());
        contar(arroz.getId(), "1", null).andExpect(status().isUnauthorized());
    }

    @Test
    void listar_TraeLosConteosDelInsumo_LosMasNuevosPrimero() throws Exception {
        contar(arroz.getId(), "12", almacenero).andExpect(status().isCreated());
        contar(arroz.getId(), "11", almacenero).andExpect(status().isCreated());
        mockMvc.perform(get("/api/conteos").param("ingredienteId", arroz.getId().toString())
                        .header("Authorization", almacenero))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].cantidadContada").value(11.0));
        mockMvc.perform(get("/api/conteos").param("ingredienteId", polloOtroRestaurante.getId().toString())
                        .header("Authorization", almacenero))
                .andExpect(status().isNotFound());
    }
}
