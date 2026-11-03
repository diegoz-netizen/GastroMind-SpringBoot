package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.dto.CompraOpcionesResponse;
import com.gastromind.backendspring.dto.IngresoCompraRequest;
import com.gastromind.backendspring.dto.IngresoCompraResponse;
import com.gastromind.backendspring.service.CompraService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * HU-14: ingreso de compras al almacén (lo usa la app Kotlin del almacenero).
 */
@RestController
@RequestMapping("/api/compras")
public class CompraController {

    private final CompraService compraService;

    public CompraController(CompraService compraService) {
        this.compraService = compraService;
    }

    @PostMapping
    public ResponseEntity<IngresoCompraResponse> registrar(@Valid @RequestBody IngresoCompraRequest request,
                                                           Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(compraService.registrar(request, authentication));
    }

    @GetMapping
    public List<IngresoCompraResponse> listar(Authentication authentication) {
        return compraService.listar(authentication);
    }

    @GetMapping("/opciones")
    public CompraOpcionesResponse opciones(Authentication authentication) {
        return compraService.opciones(authentication);
    }
}
