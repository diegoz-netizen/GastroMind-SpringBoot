package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.dto.CambioEstadoPlatilloRequest;
import com.gastromind.backendspring.dto.PedidoRequest;
import com.gastromind.backendspring.dto.PedidoResponse;
import com.gastromind.backendspring.service.PedidoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Base de pedidos del Sprint 3 (lo usa la app Kotlin del mozo y de cocina).
 */
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService pedidoService;

    public PedidoController(PedidoService pedidoService) {
        this.pedidoService = pedidoService;
    }

    @PostMapping
    public ResponseEntity<PedidoResponse> crear(@Valid @RequestBody PedidoRequest request,
                                                Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pedidoService.crear(request, authentication));
    }

    @PatchMapping("/{pedidoId}/detalles/{detalleId}/estado")
    public PedidoResponse cambiarEstadoPlatillo(@PathVariable Long pedidoId,
                                                @PathVariable Long detalleId,
                                                @Valid @RequestBody CambioEstadoPlatilloRequest request,
                                                Authentication authentication) {
        return pedidoService.cambiarEstadoPlatillo(pedidoId, detalleId, request, authentication);
    }
}
