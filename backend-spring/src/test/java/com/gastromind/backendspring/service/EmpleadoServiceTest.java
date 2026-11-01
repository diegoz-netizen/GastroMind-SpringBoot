package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.EmpleadoRegistroRequest;
import com.gastromind.backendspring.dto.EmpleadoResponse;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Restaurante;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.repository.EmpleadoRepository;
import com.gastromind.backendspring.repository.RolRepository;
import com.gastromind.backendspring.service.impl.EmpleadoServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmpleadoServiceTest {

    @Mock
    private EmpleadoRepository empleadoRepository;

    @Mock
    private RolRepository rolRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private CorreoService correoService;

    @Mock
    private RecuperacionService recuperacionService;

    @InjectMocks
    private EmpleadoServiceImpl empleadoService;

    private Empleado adminMock;
    private Rol rolMock;
    private Restaurante restauranteMock;

    @BeforeEach
    void setUp() {
        restauranteMock = new Restaurante();
        restauranteMock.setId(1L);

        Rol rolAdmin = new Rol();
        rolAdmin.setId(1L);
        rolAdmin.setNombre("ADMINISTRADOR");

        adminMock = new Empleado();
        adminMock.setId(1L);
        adminMock.setCorreo("admin@restaurante.com");
        adminMock.setRol(rolAdmin);
        adminMock.setEstado("ACTIVO");
        adminMock.setRestaurante(restauranteMock);

        rolMock = new Rol();
        rolMock.setId(2L);
        rolMock.setNombre("COCINERO");
    }

    @Test
    void registrarEmpleado_Exito() {
        EmpleadoRegistroRequest request = new EmpleadoRegistroRequest(
                "Carlos Perez", "carlos@restaurante.com", 2L, "1234"
        );

        when(empleadoRepository.findById(1L)).thenReturn(Optional.of(adminMock));
        when(empleadoRepository.existsByCorreo("carlos@restaurante.com")).thenReturn(false);
        when(rolRepository.findById(2L)).thenReturn(Optional.of(rolMock));
        when(empleadoRepository.save(any(Empleado.class))).thenAnswer(invocation -> {
            Empleado e = invocation.getArgument(0);
            e.setId(10L);
            return e;
        });

        EmpleadoResponse response = empleadoService.registrarEmpleado(request, "1");

        assertNotNull(response);
        assertEquals("Carlos Perez", response.nombreCompleto());
        assertEquals("ACTIVO", response.estado());
        assertEquals("COCINERO", response.rol());
        assertEquals("1234", response.pinAcceso());  // la única vez que el admin ve el PIN
        verify(empleadoRepository, times(1)).save(any(Empleado.class));
    }

    private EmpleadoRegistroRequest requestValido() {
        return new EmpleadoRegistroRequest(
                "Carlos Perez", "carlos@restaurante.com", 2L, "1234"
        );
    }

    private void prepararRegistroValido() {
        when(empleadoRepository.findById(1L)).thenReturn(Optional.of(adminMock));
        when(empleadoRepository.existsByCorreo("carlos@restaurante.com")).thenReturn(false);
        when(rolRepository.findById(2L)).thenReturn(Optional.of(rolMock));
        when(empleadoRepository.save(any(Empleado.class))).thenAnswer(invocation -> {
            Empleado e = invocation.getArgument(0);
            e.setId(10L);
            return e;
        });
        when(recuperacionService.crearEnlaceBienvenida(any(Empleado.class)))
                .thenReturn("http://localhost:5173/restablecer?token=abc&bienvenida=1");
    }

    @Test
    void registrarEmpleado_GuardaUnaClaveAlAzarYElPinConHash() {
        prepararRegistroValido();
        when(passwordEncoder.encode(anyString())).thenReturn("hashClaveAlAzar");
        when(passwordEncoder.encode("1234")).thenReturn("hashPin");

        empleadoService.registrarEmpleado(requestValido(), "1");

        ArgumentCaptor<Empleado> captor = ArgumentCaptor.forClass(Empleado.class);
        verify(empleadoRepository).save(captor.capture());
        assertEquals("hashClaveAlAzar", captor.getValue().getPasswordHash());
        assertEquals("hashPin", captor.getValue().getPinAcceso());
        assertEquals(restauranteMock, captor.getValue().getRestaurante());
    }

    @Test
    void registrarEmpleado_ClaveAlAzarDistintaEnCadaRegistro() {
        prepararRegistroValido();

        empleadoService.registrarEmpleado(requestValido(), "1");
        empleadoService.registrarEmpleado(requestValido(), "1");

        ArgumentCaptor<String> claves = ArgumentCaptor.forClass(String.class);
        verify(passwordEncoder, times(4)).encode(claves.capture());  // clave + PIN, dos veces
        String primera = claves.getAllValues().get(0);
        String segunda = claves.getAllValues().get(2);
        assertNotEquals(primera, segunda);
        assertTrue(primera.length() >= 32);
    }

    @Test
    void registrarEmpleado_SinPin_GeneraUnoDe4Digitos() {
        prepararRegistroValido();
        when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "hash:" + inv.getArgument(0));
        EmpleadoRegistroRequest request = new EmpleadoRegistroRequest(
                "Carlos Perez", "carlos@restaurante.com", 2L, null
        );

        EmpleadoResponse response = empleadoService.registrarEmpleado(request, "1");

        assertTrue(response.pinAcceso().matches("\\d{4}"), response.pinAcceso());
        ArgumentCaptor<Empleado> captor = ArgumentCaptor.forClass(Empleado.class);
        verify(empleadoRepository).save(captor.capture());
        assertEquals("hash:" + response.pinAcceso(), captor.getValue().getPinAcceso());
    }

    @Test
    void registrarEmpleado_NoAdmin_Lanza403() {
        Rol rolCocinero = new Rol();
        rolCocinero.setNombre("COCINERO");
        adminMock.setRol(rolCocinero);
        when(empleadoRepository.findById(1L)).thenReturn(Optional.of(adminMock));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                empleadoService.registrarEmpleado(requestValido(), "1")
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(empleadoRepository, never()).save(any(Empleado.class));
    }

    @Test
    void registrarEmpleado_AdminInactivo_Lanza401() {
        adminMock.setEstado("INACTIVO");
        when(empleadoRepository.findById(1L)).thenReturn(Optional.of(adminMock));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                empleadoService.registrarEmpleado(requestValido(), "1")
        );
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void registrarEmpleado_RolInexistente_Lanza400() {
        when(empleadoRepository.findById(1L)).thenReturn(Optional.of(adminMock));
        when(empleadoRepository.existsByCorreo("carlos@restaurante.com")).thenReturn(false);
        when(rolRepository.findById(2L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                empleadoService.registrarEmpleado(requestValido(), "1")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(empleadoRepository, never()).save(any(Empleado.class));
    }

    @Test
    void registrarEmpleado_EnviaBienvenidaConElEnlaceYSinCredenciales() {
        prepararRegistroValido();

        empleadoService.registrarEmpleado(requestValido(), "1");

        ArgumentCaptor<String> cuerpo = ArgumentCaptor.forClass(String.class);
        verify(correoService).enviar(eq("carlos@restaurante.com"), anyString(), cuerpo.capture());
        String texto = cuerpo.getValue();
        assertTrue(texto.contains("Carlos Perez"));
        assertTrue(texto.contains("COCINERO"));
        assertTrue(texto.contains("carlos@restaurante.com"));
        assertTrue(texto.contains("http://localhost:5173/restablecer?token=abc&bienvenida=1"));
        // HU-01-b (DoD): ni la contraseña ni el PIN viajan por correo
        assertFalse(texto.contains("1234"));
        assertFalse(texto.contains("Contraseña:"));
    }

    @Test
    void registrarEmpleado_CreaElEnlaceDelEmpleadoGuardado() {
        prepararRegistroValido();

        empleadoService.registrarEmpleado(requestValido(), "1");

        ArgumentCaptor<Empleado> captor = ArgumentCaptor.forClass(Empleado.class);
        verify(recuperacionService).crearEnlaceBienvenida(captor.capture());
        assertEquals(10L, captor.getValue().getId());
    }

    @Test
    void registrarEmpleado_FallaElCorreo_IgualRegistra() {
        prepararRegistroValido();
        doThrow(new RuntimeException("SMTP caído")).when(correoService)
                .enviar(anyString(), anyString(), anyString());

        EmpleadoResponse response = empleadoService.registrarEmpleado(requestValido(), "1");

        assertEquals(10L, response.id());
        verify(empleadoRepository).save(any(Empleado.class));
    }

    @Test
    void registrarEmpleado_CorreoDuplicado_LanzaExcepcion() {
        EmpleadoRegistroRequest request = new EmpleadoRegistroRequest(
                "Carlos Perez", "duplicado@restaurante.com", 2L, "1234"
        );

        when(empleadoRepository.findById(1L)).thenReturn(Optional.of(adminMock));
        when(empleadoRepository.existsByCorreo("duplicado@restaurante.com")).thenReturn(true);

        assertThrows(ResponseStatusException.class, () ->
                empleadoService.registrarEmpleado(request, "1")
        );
        verifyNoInteractions(recuperacionService, correoService);
    }
}