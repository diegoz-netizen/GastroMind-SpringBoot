package com.gastromind.backendspring.service;

import com.gastromind.backendspring.config.RecuperacionProperties;
import com.gastromind.backendspring.entity.Empleado;
import com.gastromind.backendspring.entity.EstadoEmpleado;
import com.gastromind.backendspring.entity.TokenRecuperacion;
import com.gastromind.backendspring.repository.EmpleadoRepository;
import com.gastromind.backendspring.repository.TokenRecuperacionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

/**
 * HU-04: recuperar la contraseña desde el correo.
 * - solicitar(): responde siempre igual (exista o no el correo) para no revelar qué correos están registrados.
 *   HL-035: con demasiadas solicitudes por correo o por IP responde 429, también igual exista o no el correo.
 * - restablecer(): CA-04, el enlace caduca y solo se usa una vez.
 */
@Service
public class RecuperacionService {

    private static final Logger log = LoggerFactory.getLogger(RecuperacionService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    static final String ENLACE_INVALIDO = "El enlace no es válido o ya caducó. Solicita uno nuevo.";
    static final String DEMASIADAS_SOLICITUDES =
            "Hiciste demasiadas solicitudes. Espera unos minutos e intenta de nuevo.";

    private final EmpleadoRepository empleadoRepository;
    private final TokenRecuperacionRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final CorreoService correoService;
    private final RecuperacionProperties properties;
    private final LimiteSolicitudes limite;

    public RecuperacionService(EmpleadoRepository empleadoRepository,
                               TokenRecuperacionRepository tokenRepository,
                               PasswordEncoder passwordEncoder,
                               CorreoService correoService,
                               RecuperacionProperties properties,
                               LimiteSolicitudes limite) {
        this.empleadoRepository = empleadoRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.correoService = correoService;
        this.properties = properties;
        this.limite = limite;
    }

    @Transactional
    public void solicitar(String correo, String ip) {
        verificarLimite(correo.trim().toLowerCase(), ip);

        Empleado empleado = empleadoRepository.findByCorreo(correo.trim()).orElse(null);
        // Correo inexistente o cuenta inactiva (HU-03): no se envía nada, pero la respuesta es la misma
        if (empleado == null || !EstadoEmpleado.ACTIVO.name().equals(empleado.getEstado())) {
            return;
        }

        LocalDateTime ahora = LocalDateTime.now();
        // Solo vale el último enlace: los anteriores sin usar dejan de servir
        tokenRepository.findByEmpleadoIdAndUsadoEnIsNull(empleado.getId())
                .forEach(anterior -> anterior.setUsadoEn(ahora));

        String token = generarToken();
        tokenRepository.save(TokenRecuperacion.builder()
                .empleado(empleado)
                .tokenHash(hash(token))
                .expiraEn(ahora.plusMinutes(properties.getExpiracionMinutos()))
                .build());

        String enlace = properties.getUrlRestablecer() + "?token=" + token;
        try {
            correoService.enviar(empleado.getCorreo(), "GastroMind - Recuperar contraseña",
                    "Hola " + empleado.getNombreCompleto() + ",\n\n"
                            + "Para crear una nueva contraseña entra a este enlace:\n" + enlace + "\n\n"
                            + "Caduca en " + properties.getExpiracionMinutos() + " minutos y solo se puede usar una vez.\n"
                            + "Si no lo pediste, ignora este correo.");
        } catch (RuntimeException e) {
            // No se cambia la respuesta: el cliente no debe saber si el correo existe
            log.error("No se pudo enviar el correo de recuperación al empleado {}", empleado.getId(), e);
        }
    }

    @Transactional
    public void restablecer(String token, String nuevaContrasena) {
        TokenRecuperacion recuperacion = tokenRepository.findByTokenHash(hash(token))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, ENLACE_INVALIDO));

        LocalDateTime ahora = LocalDateTime.now();
        Empleado empleado = recuperacion.getEmpleado();
        if (!recuperacion.estaVigente(ahora) || !EstadoEmpleado.ACTIVO.name().equals(empleado.getEstado())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ENLACE_INVALIDO);
        }

        empleado.setPasswordHash(passwordEncoder.encode(nuevaContrasena));
        // HL-035: las sesiones abiertas con la contraseña anterior dejan de valer
        empleado.setVersionToken(empleado.getVersionToken() + 1);
        recuperacion.setUsadoEn(ahora);
    }

    // Se cuentan las dos claves siempre: si se cortara en la primera, la IP no sumaría cuando falla el correo
    private void verificarLimite(String correo, String ip) {
        Instant ahora = Instant.now();
        Duration ventana = Duration.ofMinutes(properties.getVentanaLimiteMinutos());
        boolean porCorreo = limite.permitir("correo:" + correo, properties.getMaxPorCorreo(), ventana, ahora);
        boolean porIp = limite.permitir("ip:" + ip, properties.getMaxPorIp(), ventana, ahora);
        if (!porCorreo || !porIp) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, DEMASIADAS_SOLICITUDES);
        }
    }

    private static String generarToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
