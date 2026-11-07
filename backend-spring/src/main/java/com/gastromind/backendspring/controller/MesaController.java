package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.dto.MesaRequest;
import com.gastromind.backendspring.dto.MesaResponse;
import com.gastromind.backendspring.service.MesaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Mesas del restaurante del token. GET: la app del mozo (HU-09) y la web del administrador.
 * POST y PUT: el administrador registra y edita las mesas del salón (HU-26).
 */
@RestController
@RequestMapping("/api/mesas")
public class MesaController {

    private final MesaService mesaService;

    public MesaController(MesaService mesaService) {
        this.mesaService = mesaService;
    }

    @GetMapping
    public List<MesaResponse> listar(Authentication authentication) {
        return mesaService.listar(authentication);
    }

    @PostMapping
    public ResponseEntity<MesaResponse> crear(@Valid @RequestBody MesaRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mesaService.crear(request, authentication));
    }

    @PutMapping("/{id}")
    public MesaResponse editar(@PathVariable Long id, @Valid @RequestBody MesaRequest request,
                               Authentication authentication) {
        return mesaService.editar(id, request, authentication);
    }
}
