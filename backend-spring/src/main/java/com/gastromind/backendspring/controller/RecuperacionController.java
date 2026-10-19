package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.dto.RecuperarRequest;
import com.gastromind.backendspring.dto.RestablecerRequest;
import com.gastromind.backendspring.service.RecuperacionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * HU-04: endpoints públicos (cubiertos por /api/auth/** permitAll en SecurityConfig).
 */
@RestController
@RequestMapping("/api/auth")
public class RecuperacionController {

    static final String MENSAJE_SOLICITUD =
            "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.";

    private final RecuperacionService recuperacionService;

    public RecuperacionController(RecuperacionService recuperacionService) {
        this.recuperacionService = recuperacionService;
    }

    @PostMapping("/recuperar")
    public ResponseEntity<Map<String, String>> recuperar(@Valid @RequestBody RecuperarRequest request,
                                                         HttpServletRequest http) {
        recuperacionService.solicitar(request.correo(), http.getRemoteAddr());
        return ResponseEntity.ok(Map.of("mensaje", MENSAJE_SOLICITUD));
    }

    @PostMapping("/restablecer")
    public ResponseEntity<Map<String, String>> restablecer(@Valid @RequestBody RestablecerRequest request) {
        recuperacionService.restablecer(request.token(), request.nuevaContrasena());
        return ResponseEntity.ok(Map.of("mensaje", "Tu contraseña se actualizó. Ya puedes iniciar sesión."));
    }
}
