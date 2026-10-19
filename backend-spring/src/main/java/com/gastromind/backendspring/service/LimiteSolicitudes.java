package com.gastromind.backendspring.service;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * HL-035: cuenta solicitudes por clave (correo o IP) en una ventana de tiempo que se desliza.
 * Vive en memoria: alcanza para un solo servidor; si se reinicia Spring, los contadores vuelven a 0.
 */
@Component
public class LimiteSolicitudes {

    private final Map<String, Deque<Instant>> solicitudes = new ConcurrentHashMap<>();

    /** Registra la solicitud y devuelve false si la clave ya llegó a {@code maximo} dentro de la ventana. */
    public boolean permitir(String clave, int maximo, Duration ventana, Instant ahora) {
        boolean[] permitida = {false};
        solicitudes.compute(clave, (k, previas) -> {
            Deque<Instant> vigentes = previas != null ? previas : new ArrayDeque<>();
            while (!vigentes.isEmpty() && !vigentes.peekFirst().isAfter(ahora.minus(ventana))) {
                vigentes.pollFirst();
            }
            if (vigentes.size() < maximo) {
                vigentes.addLast(ahora);
                permitida[0] = true;
            }
            return vigentes.isEmpty() ? null : vigentes;
        });
        return permitida[0];
    }

    /** Para los tests: cada uno empieza con los contadores en 0. */
    public void limpiar() {
        solicitudes.clear();
    }
}
