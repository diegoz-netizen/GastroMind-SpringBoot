package com.gastromind.backendspring.service.impl;

import com.gastromind.backendspring.dto.EmpleadoRegistroRequest;
import com.gastromind.backendspring.dto.EmpleadoResponse;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.Rol;
import com.gastromind.backendspring.repository.EmpleadoRepository;
import com.gastromind.backendspring.repository.RolRepository;
import com.gastromind.backendspring.service.CorreoService;
import com.gastromind.backendspring.service.EmpleadoService;
import com.gastromind.backendspring.service.RecuperacionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.Base64;

@Service
public class EmpleadoServiceImpl implements EmpleadoService {

    private static final Logger log = LoggerFactory.getLogger(EmpleadoServiceImpl.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmpleadoRepository empleadoRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;
    private final CorreoService correoService;
    private final RecuperacionService recuperacionService;

    public EmpleadoServiceImpl(EmpleadoRepository empleadoRepository,
                               RolRepository rolRepository,
                               PasswordEncoder passwordEncoder,
                               CorreoService correoService,
                               RecuperacionService recuperacionService) {
        this.empleadoRepository = empleadoRepository;
        this.rolRepository = rolRepository;
        this.passwordEncoder = passwordEncoder;
        this.correoService = correoService;
        this.recuperacionService = recuperacionService;
    }

    @Override
    @Transactional
    public EmpleadoResponse registrarEmpleado(EmpleadoRegistroRequest request, String adminIdStr) {
        Long adminId;
        try {
            adminId = Long.valueOf(adminIdStr);
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        }

        // 1. Buscar al admin autenticado por ID
        Empleado admin = empleadoRepository.findById(adminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado"));

        // 2. Validar que el admin este ACTIVO y tenga rol ADMINISTRADOR
        if (!"ACTIVO".equalsIgnoreCase(admin.getEstado())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Su cuenta se encuentra inactiva");
        }
        if (!"ADMINISTRADOR".equalsIgnoreCase(admin.getRol().getNombre())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere rol ADMINISTRADOR");
        }

        // 3. Validar correo duplicado (409)
        if (empleadoRepository.existsByCorreo(request.correo())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo ya esta registrado");
        }

        // 4. Buscar rol a asignar
        Rol rol = rolRepository.findById(request.rolId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rol no valido"));

        // 5. Crear el nuevo empleado asignando el restaurante del admin
        Empleado nuevo = new Empleado();
        nuevo.setNombreCompleto(request.nombreCompleto());
        nuevo.setCorreo(request.correo());

        // HU-01-b: una clave al azar que nadie conoce, hasta que el empleado cree la suya con el enlace
        nuevo.setPasswordHash(passwordEncoder.encode(claveAlAzar()));
        // El PIN lo da el admin (4 dígitos, validado en el DTO) o se genera; se guarda con hash
        String pin = request.pinAcceso() != null ? request.pinAcceso() : pinAlAzar();
        nuevo.setPinAcceso(passwordEncoder.encode(pin));

        nuevo.setRol(rol);
        nuevo.setRestaurante(admin.getRestaurante());
        nuevo.setEstado("ACTIVO");

        Empleado guardado = empleadoRepository.save(nuevo);

        // HU-01-b (Review 2): el correo no lleva la contraseña ni el PIN, solo el enlace para crear la contraseña
        String enlace = recuperacionService.crearEnlaceBienvenida(guardado);
        try {
            correoService.enviar(guardado.getCorreo(), "GastroMind - Bienvenido",
                    "Hola " + guardado.getNombreCompleto() + ",\n\n"
                            + "Ya tienes cuenta en GastroMind como " + rol.getNombre() + ".\n"
                            + "Tu usuario es este correo: " + guardado.getCorreo() + "\n\n"
                            + "Para crear tu contraseña entra a este enlace:\n" + enlace + "\n\n"
                            + "Caduca en 24 horas y solo se puede usar una vez. Si caduca, usa \"¿Olvidaste tu contraseña?\"\n"
                            + "en la pantalla de inicio. Tu PIN para la app te lo entrega tu administrador.");
        } catch (RuntimeException e) {
            // El empleado ya quedó registrado: un fallo del correo no cambia la respuesta
            log.error("No se pudo enviar el correo de bienvenida al empleado {}", guardado.getId(), e);
        }

        return new EmpleadoResponse(
                guardado.getId(),
                guardado.getNombreCompleto(),
                guardado.getCorreo(),
                guardado.getRol().getNombre(),
                guardado.getRestaurante().getId(),
                guardado.getEstado(),
                pin
        );
    }

    private static String claveAlAzar() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    private static String pinAlAzar() {
        return String.format("%04d", RANDOM.nextInt(10_000));
    }
}