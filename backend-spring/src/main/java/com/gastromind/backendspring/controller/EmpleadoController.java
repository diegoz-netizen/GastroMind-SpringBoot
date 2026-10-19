package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.dto.EmpleadoRegistroRequest;
import com.gastromind.backendspring.dto.EmpleadoResponse;
import com.gastromind.backendspring.service.EmpleadoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/empleados")
public class EmpleadoController {

    private final EmpleadoService empleadoService;

    public EmpleadoController(EmpleadoService empleadoService) {
        this.empleadoService = empleadoService;
    }

    @PostMapping
    public ResponseEntity<EmpleadoResponse> registrarEmpleado(
            @Valid @RequestBody EmpleadoRegistroRequest request,
            Authentication authentication) {

        // authentication.getName() devuelve el ID del admin (ej. "1"), no el correo
        String adminIdStr = authentication.getName();
        EmpleadoResponse respuesta = empleadoService.registrarEmpleado(request, adminIdStr);
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }
}