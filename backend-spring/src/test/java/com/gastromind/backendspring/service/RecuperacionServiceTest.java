package com.gastromind.backendspring.service;

import com.gastromind.backendspring.config.RecuperacionProperties;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.TokenRecuperacion;
import com.gastromind.backendspring.repository.EmpleadoRepository;
import com.gastromind.backendspring.repository.TokenRecuperacionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecuperacionServiceTest {

    private static final String IP = "10.0.0.1";

    @Mock
    private EmpleadoRepository empleadoRepository;

    @Mock
    private TokenRecuperacionRepository tokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private CorreoService correoService;

    private RecuperacionService service;
    private Empleado activo;

    @BeforeEach
    void setUp() {
        RecuperacionProperties properties = new RecuperacionProperties();
        properties.setExpiracionMinutos(15);
        properties.setUrlRestablecer("http://localhost:5173/restablecer");
        service = new RecuperacionService(empleadoRepository, tokenRepository, passwordEncoder, correoService, properties,
                new LimiteSolicitudes());

        activo = Empleado.builder().id(1L).nombreCompleto("Ana Mozo").correo("ana@test.com")
                .passwordHash("hash-viejo").estado("ACTIVO").build();
    }

    private TokenRecuperacion tokenDe(Empleado empleado, LocalDateTime expiraEn, LocalDateTime usadoEn) {
        return TokenRecuperacion.builder().id(10L).empleado(empleado)
                .tokenHash(RecuperacionService.hash("token-valido")).expiraEn(expiraEn).usadoEn(usadoEn).build();
    }

    @Test
    void solicitar_EmpleadoActivo_DeberiaGuardarSoloElHashYEnviarElEnlace() {
        when(empleadoRepository.findByCorreo("ana@test.com")).thenReturn(Optional.of(activo));

        service.solicitar("ana@test.com", IP);

        ArgumentCaptor<TokenRecuperacion> guardado = ArgumentCaptor.forClass(TokenRecuperacion.class);
        verify(tokenRepository).findByEmpleadoIdAndUsadoEnIsNull(1L);
        verify(tokenRepository).save(guardado.capture());
        ArgumentCaptor<String> cuerpo = ArgumentCaptor.forClass(String.class);
        verify(correoService).enviar(eq("ana@test.com"), anyString(), cuerpo.capture());

        String token = cuerpo.getValue().split("token=")[1].split("\\s")[0];
        assertEquals(RecuperacionService.hash(token), guardado.getValue().getTokenHash());
        assertNotEquals(token, guardado.getValue().getTokenHash());
        assertTrue(guardado.getValue().getExpiraEn().isAfter(LocalDateTime.now().plusMinutes(14)));
        assertTrue(guardado.getValue().getExpiraEn().isBefore(LocalDateTime.now().plusMinutes(16)));
    }

    @Test
    void solicitar_ConEnlacesAnteriores_DeberiaAnularlos() {
        TokenRecuperacion anterior = tokenDe(activo, LocalDateTime.now().plusMinutes(10), null);
        when(empleadoRepository.findByCorreo("ana@test.com")).thenReturn(Optional.of(activo));
        when(tokenRepository.findByEmpleadoIdAndUsadoEnIsNull(1L)).thenReturn(java.util.List.of(anterior));

        service.solicitar("ana@test.com", IP);

        assertNotNull(anterior.getUsadoEn());
    }

    @Test
    void solicitar_CorreoInexistente_NoDeberiaEnviarNiGuardarNada() {
        when(empleadoRepository.findByCorreo("nadie@test.com")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> service.solicitar("nadie@test.com", IP));
        verifyNoInteractions(tokenRepository, correoService);
    }

    @Test
    void solicitar_EmpleadoInactivo_NoDeberiaEnviarNiGuardarNada() {
        activo.setEstado("INACTIVO");
        when(empleadoRepository.findByCorreo("ana@test.com")).thenReturn(Optional.of(activo));

        service.solicitar("ana@test.com", IP);
        verifyNoInteractions(tokenRepository, correoService);
    }

    @Test
    void solicitar_FallaElSmtp_NoDeberiaPropagarElError() {
        when(empleadoRepository.findByCorreo("ana@test.com")).thenReturn(Optional.of(activo));
        doThrow(new RuntimeException("SMTP caído")).when(correoService).enviar(anyString(), anyString(), anyString());

        assertDoesNotThrow(() -> service.solicitar("ana@test.com", IP));
    }

    @Test
    void restablecer_TokenVigente_DeberiaCambiarLaContrasenaYMarcarloUsado() {
        TokenRecuperacion token = tokenDe(activo, LocalDateTime.now().plusMinutes(10), null);
        when(tokenRepository.findByTokenHash(RecuperacionService.hash("token-valido"))).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("nueva123")).thenReturn("hash-nuevo");

        service.restablecer("token-valido", "nueva123");

        assertEquals("hash-nuevo", activo.getPasswordHash());
        assertNotNull(token.getUsadoEn());
    }

    @Test
    void restablecer_TokenInexistente_DeberiaLanzar400() {
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.restablecer("inventado", "nueva123"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void restablecer_TokenVencido_DeberiaLanzar400SinCambiarLaContrasena() {
        TokenRecuperacion token = tokenDe(activo, LocalDateTime.now().minusMinutes(1), null);
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThrows(ResponseStatusException.class, () -> service.restablecer("token-valido", "nueva123"));
        assertEquals("hash-viejo", activo.getPasswordHash());
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void restablecer_TokenYaUsado_DeberiaLanzar400() {
        TokenRecuperacion token = tokenDe(activo, LocalDateTime.now().plusMinutes(10), LocalDateTime.now().minusMinutes(2));
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThrows(ResponseStatusException.class, () -> service.restablecer("token-valido", "nueva123"));
        assertEquals("hash-viejo", activo.getPasswordHash());
    }

    @Test
    void restablecer_EmpleadoDesactivadoDespuesDePedirElEnlace_DeberiaLanzar400() {
        activo.setEstado("INACTIVO");
        TokenRecuperacion token = tokenDe(activo, LocalDateTime.now().plusMinutes(10), null);
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThrows(ResponseStatusException.class, () -> service.restablecer("token-valido", "nueva123"));
        assertEquals("hash-viejo", activo.getPasswordHash());
    }

    @Test
    void solicitar_CuartaVezMismoCorreo_DeberiaResponder429SinEnviar() {
        when(empleadoRepository.findByCorreo("ana@test.com")).thenReturn(Optional.of(activo));
        for (int i = 0; i < 3; i++) {
            service.solicitar("ana@test.com", IP);
        }
        reset(correoService);

        // Mayúsculas y espacios cuentan como el mismo correo
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.solicitar(" ANA@test.com ", "10.0.0.2"));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        verifyNoInteractions(correoService);
    }

    @Test
    void solicitar_UnaIpConMuchosCorreos_DeberiaResponder429() {
        for (int i = 0; i < 10; i++) {
            service.solicitar("nadie" + i + "@test.com", IP);
        }

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.solicitar("otro@test.com", IP));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        assertDoesNotThrow(() -> service.solicitar("otro@test.com", "10.0.0.2"));
    }
}
