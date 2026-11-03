package com.gastromind.backendspring.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Habilita @Scheduled: la revisión diaria de vencimientos de la HU-16 (AlertaService) corre sola
 * mientras el backend está levantado, sin cron ni nada del sistema operativo.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
