package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.dto.ConteoRequest;
import com.gastromind.backendspring.dto.ConteoResponse;
import com.gastromind.backendspring.service.ConteoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * HU-30: conteo físico de un insumo (lo usa la app Kotlin del almacenero).
 */
@RestController
@RequestMapping("/api/conteos")
public class ConteoController {

    private final ConteoService conteoService;

    public ConteoController(ConteoService conteoService) {
        this.conteoService = conteoService;
    }

    @PostMapping
    public ResponseEntity<ConteoResponse> registrar(@Valid @RequestBody ConteoRequest request,
                                                    Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(conteoService.registrar(request, authentication));
    }

    // Los últimos 20 conteos del insumo, los más nuevos primero
    @GetMapping
    public List<ConteoResponse> listar(@RequestParam Long ingredienteId, Authentication authentication) {
        return conteoService.listar(ingredienteId, authentication);
    }
}
