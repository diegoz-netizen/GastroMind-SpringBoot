package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.dto.MesaResponse;
import com.gastromind.backendspring.service.MesaService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Mesas del restaurante del token (id, numero, estado). Lo usa la app Kotlin del mozo en la HU-09.
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
}
