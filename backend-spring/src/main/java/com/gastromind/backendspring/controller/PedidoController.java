package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.dto.AgregarPlatillosRequest;
import com.gastromind.backendspring.dto.CambioEstadoPlatilloRequest;
import com.gastromind.backendspring.dto.CuentaResponse;
import com.gastromind.backendspring.dto.PedidoRequest;
import com.gastromind.backendspring.dto.PedidoResponse;
import com.gastromind.backendspring.service.PedidoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping
    public List<PedidoResponse> listarVigentes(Authentication authentication) {
        return pedidoService.listarVigentes(authentication);
    }

    @PostMapping
    public ResponseEntity<PedidoResponse> crear(@Valid @RequestBody PedidoRequest request,
                                                Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pedidoService.crear(request, authentication));
    }

    // HU-09, segunda ronda: suma platillos al pedido abierto de la mesa
    @PostMapping("/{pedidoId}/detalles")
    public PedidoResponse agregarPlatillos(@PathVariable Long pedidoId,
                                           @Valid @RequestBody AgregarPlatillosRequest request,
                                           Authentication authentication) {
        return pedidoService.agregarPlatillos(pedidoId, request, authentication);
    }

    @PatchMapping("/{pedidoId}/detalles/{detalleId}/estado")
    public PedidoResponse cambiarEstadoPlatillo(@PathVariable Long pedidoId,
                                                @PathVariable Long detalleId,
                                                @Valid @RequestBody CambioEstadoPlatilloRequest request,
                                                Authentication authentication) {
        return pedidoService.cambiarEstadoPlatillo(pedidoId, detalleId, request, authentication);
    }

    // HU-12: cierra la mesa y devuelve la cuenta con lo servido
    @PostMapping("/{pedidoId}/cerrar")
    public CuentaResponse cerrar(@PathVariable Long pedidoId, Authentication authentication) {
        return pedidoService.cerrar(pedidoId, authentication);
    }
}
