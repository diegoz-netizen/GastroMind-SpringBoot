package com.gastromind.backendspring.security;

import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.EstadoEmpleado;
import com.gastromind.backendspring.repository.EmpleadoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Helper común para obtener al empleado autenticado y su restaurante a partir del token.
 * El principal es el id del empleado (Long) que pone el JwtAuthenticationFilter, NO el correo:
 * usar este helper evita repetir el bug de "correo vs id" de HU-01.
 * Toda consulta de una HU debe filtrar por {@link #restauranteId(Authentication)} (multi-tenant).
 */
@Component
public class EmpleadoActual {

    private static final String ROL_ADMINISTRADOR = "ADMINISTRADOR";

    private final EmpleadoRepository empleadoRepository;

    public EmpleadoActual(EmpleadoRepository empleadoRepository) {
        this.empleadoRepository = empleadoRepository;
    }

    /**
     * Empleado autenticado y ACTIVO. El filtro ya lo exige, pero se vuelve a comprobar
     * por si el estado cambió durante la petición.
     */
    public Empleado obtener(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof Long empleadoId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autenticación requerida");
        }
        Empleado empleado = empleadoRepository.findById(empleadoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidad no válida"));
        if (!EstadoEmpleado.ACTIVO.name().equals(empleado.getEstado())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Su cuenta se encuentra inactiva");
        }
        return empleado;
    }

    /** Igual que {@link #obtener(Authentication)}, pero además exige rol ADMINISTRADOR (403 si no). */
    public Empleado obtenerAdministrador(Authentication authentication) {
        Empleado empleado = obtener(authentication);
        if (!ROL_ADMINISTRADOR.equalsIgnoreCase(empleado.getRol().getNombre())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere rol ADMINISTRADOR");
        }
        return empleado;
    }

    /** Igual que {@link #obtener(Authentication)}, pero exige uno de los roles indicados (403 si no). */
    public Empleado obtenerConRol(Authentication authentication, String... roles) {
        Empleado empleado = obtener(authentication);
        String rol = empleado.getRol().getNombre();
        for (String permitido : roles) {
            if (permitido.equalsIgnoreCase(rol)) {
                return empleado;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere rol " + String.join(" o ", roles));
    }

    /** Restaurante del empleado autenticado: el cliente nunca lo envía, siempre sale de aquí. */
    public Long restauranteId(Authentication authentication) {
        return obtener(authentication).getRestaurante().getId();
    }
}
