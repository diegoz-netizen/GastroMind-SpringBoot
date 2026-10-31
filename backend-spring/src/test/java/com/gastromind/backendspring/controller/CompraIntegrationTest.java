package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Ingrediente;
import com.gastromind.backendspring.entity.Proveedor;
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
 * HU-14 de punta a punta (H2): el almacenero registra la compra con su JWT y la API valida el formato
 * antes de tocar la BD (cantidad > 0 con hasta 3 decimales, costo con hasta 2).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CompraIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String token;
    private Proveedor proveedor;
    private Ingrediente arroz;

    @BeforeEach
    void setUp() {
        Restaurante restaurante = Restaurante.builder().nombre("Restaurante Test").build();
        Rol rol = Rol.builder().nombre("ALMACENERO").build();
        entityManager.persist(restaurante);
        entityManager.persist(rol);
        Empleado almacenero = Empleado.builder().restaurante(restaurante).rol(rol)
                .nombreCompleto("Luis Almacén").correo("luis@test.com").passwordHash("hash").build();
        entityManager.persist(almacenero);
        proveedor = Proveedor.builder().restaurante(restaurante).nombre("Mayorista Lima").build();
        entityManager.persist(proveedor);
        arroz = Ingrediente.builder().restaurante(restaurante).nombre("Arroz").unidadMedida("kg")
                .stockActual(new BigDecimal("2.000")).costoUnitario(new BigDecimal("4.50")).build();
        entityManager.persist(arroz);
        entityManager.flush();
        token = "Bearer " + jwtTokenProvider.generarToken(almacenero);
    }

    private ResultActions registrar(String cantidad, String costo, String autorizacion) throws Exception {
        String cuerpo = "{\"proveedorId\":" + proveedor.getId() + ",\"ingredienteId\":" + arroz.getId()
                + ",\"cantidad\":" + cantidad + ",\"costoTotal\":" + costo + ",\"lote\":\"L-001\"}";
        var peticion = post("/api/compras").contentType(MediaType.APPLICATION_JSON).content(cuerpo);
        if (autorizacion != null) {
            peticion.header("Authorization", autorizacion);
        }
        return mockMvc.perform(peticion);
    }

    @Test
    void registrar_Responde201_ConElStockQueQuedo() throws Exception {
        registrar("10.5", "47.25", token)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.insumo").value("Arroz"))
                .andExpect(jsonPath("$.cantidad").value(10.5))
                .andExpect(jsonPath("$.stockResultante").value(12.5))
                .andExpect(jsonPath("$.registradoPor").value("Luis Almacén"));

        mockMvc.perform(get("/api/compras").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].stockResultante").doesNotExist());
    }

    @Test
    void cantidadConCuatroDecimalesOCero_Responde400() throws Exception {
        registrar("0.0005", "1", token).andExpect(status().isBadRequest());
        registrar("0", "1", token).andExpect(status().isBadRequest());
        registrar("1", "1.005", token).andExpect(status().isBadRequest());
    }

    @Test
    void sinToken_Responde401() throws Exception {
        registrar("1", "1", null).andExpect(status().isUnauthorized());
    }

    @Test
    void opciones_TraeProveedoresEInsumosConSuStock() throws Exception {
        mockMvc.perform(get("/api/compras/opciones").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proveedores[0].nombre").value("Mayorista Lima"))
                .andExpect(jsonPath("$.insumos[0].nombre").value("Arroz"))
                .andExpect(jsonPath("$.insumos[0].stockActual").value(2.0));
    }
}
