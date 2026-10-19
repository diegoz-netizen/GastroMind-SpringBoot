package com.gastromind.backendspring.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CORS: solo el React de Vite (localhost:5173) puede llamar a la API desde el navegador.
 * Se prueba la petición previa (OPTIONS) que el navegador hace antes del POST/GET real.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CorsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private ResultActions preflight(String ruta, String origen, String metodo) throws Exception {
        return mockMvc.perform(options(ruta)
                .header("Origin", origen)
                .header("Access-Control-Request-Method", metodo)
                .header("Access-Control-Request-Headers", "Authorization, Content-Type"));
    }

    @Test
    void elReactDeVite_puedeHacerLogin() throws Exception {
        preflight("/api/auth/login", "http://localhost:5173", "POST")
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void elReactDeVite_puedeLlamarRutasProtegidas() throws Exception {
        preflight("/api/empleados", "http://localhost:5173", "GET")
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void otrosPuertosLocales_yaNoEstanPermitidos() throws Exception {
        for (String origen : new String[]{"http://localhost:5174", "http://localhost:3000"}) {
            preflight("/api/auth/login", origen, "POST")
                    .andExpect(status().isForbidden())
                    .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
        }
    }

    @Test
    void unaPaginaCualquiera_noPuedeLlamarALaApi() throws Exception {
        preflight("/api/auth/login", "https://pagina-cualquiera.com", "POST")
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
