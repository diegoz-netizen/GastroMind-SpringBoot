package com.gastromind.backendspring.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class LimiteSolicitudesTest {

    private static final Duration VENTANA = Duration.ofMinutes(15);
    private final LimiteSolicitudes limite = new LimiteSolicitudes();
    private final Instant inicio = Instant.parse("2026-10-15T12:00:00Z");

    @Test
    void pasadoElMaximo_DeberiaRechazarHastaQueSalgaDeLaVentana() {
        assertTrue(limite.permitir("a", 2, VENTANA, inicio));
        assertTrue(limite.permitir("a", 2, VENTANA, inicio.plusSeconds(60)));
        assertFalse(limite.permitir("a", 2, VENTANA, inicio.plusSeconds(120)));

        // A los 15 min sale la primera; la segunda sigue dentro
        assertTrue(limite.permitir("a", 2, VENTANA, inicio.plus(VENTANA)));
        assertFalse(limite.permitir("a", 2, VENTANA, inicio.plus(VENTANA).plusSeconds(1)));
    }

    @Test
    void cadaClaveLlevaSuPropiaCuenta() {
        assertTrue(limite.permitir("a", 1, VENTANA, inicio));
        assertFalse(limite.permitir("a", 1, VENTANA, inicio));
        assertTrue(limite.permitir("b", 1, VENTANA, inicio));
    }
}
