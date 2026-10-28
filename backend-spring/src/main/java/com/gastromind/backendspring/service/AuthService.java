package com.gastromind.backendspring.service;

import com.gastromind.backendspring.dto.AuthResponse;
import com.gastromind.backendspring.dto.LoginPinRequest;
import com.gastromind.backendspring.dto.LoginRequest;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.repository.EmpleadoRepository;
import com.gastromind.backendspring.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

@Service
public class AuthService {

    // HU-27: un PIN de 4 dígitos son solo 10 000 combinaciones; se cortan los intentos fallidos
    static final int MAX_FALLOS_PIN_POR_CORREO = 5;
    static final int MAX_FALLOS_PIN_POR_IP = 20;
    static final Duration VENTANA_PIN = Duration.ofMinutes(15);
    static final String CREDENCIALES_INVALIDAS = "Credenciales inválidas";
    static final String DEMASIADOS_INTENTOS = "Demasiados intentos con PIN. Espera unos minutos o entra con tu correo y contraseña.";
    // El PIN es para la app de los roles operativos; el administrador entra con correo y contraseña
    private static final Set<String> ROLES_CON_PIN = Set.of("MOZO", "COCINERO", "ALMACENERO");

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private LimiteSolicitudes limite;

    public AuthResponse login(LoginRequest request) {
        // 1. Buscar empleado por correo
        Empleado empleado = empleadoRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));

        if (!"ACTIVO".equalsIgnoreCase(empleado.getEstado())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Su cuenta se encuentra inactiva. Contacte al administrador.");
        }

        if (!passwordEncoder.matches(request.getPassword(), empleado.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        return respuesta(empleado);
    }

    /**
     * HU-27. Correo inexistente, PIN incorrecto, sin PIN o rol sin PIN responden igual (401, mismo mensaje):
     * no se revela qué dato falló. Tras 5 fallos por correo o 20 por IP en 15 min, 429.
     */
    public AuthResponse loginPin(LoginPinRequest request, String ip) {
        String correo = request.correo().trim().toLowerCase();
        Instant ahora = Instant.now();
        if (limite.bloqueada("pin-correo:" + correo, MAX_FALLOS_PIN_POR_CORREO, VENTANA_PIN, ahora)
                || limite.bloqueada("pin-ip:" + ip, MAX_FALLOS_PIN_POR_IP, VENTANA_PIN, ahora)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, DEMASIADOS_INTENTOS);
        }

        Empleado empleado = empleadoRepository.findByCorreo(request.correo().trim()).orElse(null);
        boolean valido = empleado != null
                && empleado.getPinAcceso() != null
                && ROLES_CON_PIN.contains(empleado.getRol().getNombre().toUpperCase())
                && passwordEncoder.matches(request.pin(), empleado.getPinAcceso());
        if (!valido) {
            // Solo se cuentan los fallos: un mozo que entra varias veces en el turno no se bloquea
            limite.permitir("pin-correo:" + correo, MAX_FALLOS_PIN_POR_CORREO, VENTANA_PIN, ahora);
            limite.permitir("pin-ip:" + ip, MAX_FALLOS_PIN_POR_IP, VENTANA_PIN, ahora);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, CREDENCIALES_INVALIDAS);
        }
        // Se revisa después del PIN: con un PIN equivocado no se sabe si la cuenta existe o está inactiva
        if (!"ACTIVO".equalsIgnoreCase(empleado.getEstado())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Su cuenta se encuentra inactiva. Contacte al administrador.");
        }
        return respuesta(empleado);
    }

    private AuthResponse respuesta(Empleado empleado) {
        String token = tokenProvider.generarToken(empleado);

        return AuthResponse.builder()
                .token(token)
                .empleadoId(empleado.getId())
                .nombreCompleto(empleado.getNombreCompleto())
                .correo(empleado.getCorreo())
                .rol(empleado.getRol().getNombre())
                .restauranteId(empleado.getRestaurante().getId())
                .build();
    }
}