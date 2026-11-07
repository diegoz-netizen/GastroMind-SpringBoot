package com.gastromind.backendspring.controller;

import com.gastromind.backendspring.dto.MermaRequest;
import com.gastromind.backendspring.dto.MermaResponse;
import com.gastromind.backendspring.dto.MotivoMermaResponse;
import com.gastromind.backendspring.service.MermaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * HU-17: registrar una merma desde el almacén (lo usa la pestaña Merma de la app Kotlin).
 */
@RestController
@RequestMapping("/api/mermas")
public class MermaController {

    private final MermaService mermaService;

    public MermaController(MermaService mermaService) {
        this.mermaService = mermaService;
    }

    @PostMapping
    public ResponseEntity<MermaResponse> registrar(@Valid @RequestBody MermaRequest request,
                                                   Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mermaService.registrar(request, authentication));
    }

    @GetMapping("/motivos")
    public List<MotivoMermaResponse> motivos(Authentication authentication) {
        return mermaService.motivos(authentication);
    }
}
