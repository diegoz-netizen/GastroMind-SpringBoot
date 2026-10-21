package com.gastromind.backendspring.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Punto 4 de la Planning 2: el esquema lo definen docs/script_database.sql y docs/migraciones/,
 * no Hibernate. Arranca Spring con ddl-auto=validate contra una BD PostgreSQL creada SOLO con
 * esos scripts: si una entidad no coincide (tabla, columna o tipo), el contexto no levanta.
 *
 * Solo corre si existe ESQUEMA_DB_URL (lo define el job "esquema" del CI). En local:
 *   ESQUEMA_DB_URL=jdbc:postgresql://localhost:5432/gm_esquema ESQUEMA_DB_USER=... ESQUEMA_DB_PASSWORD=... \
 *   ./mvnw test -Dspring.profiles.active=test -Dtest=EsquemaPostgresTest
 */
@SpringBootTest
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "ESQUEMA_DB_URL", matches = ".+")
class EsquemaPostgresTest {

    @DynamicPropertySource
    static void postgres(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("ESQUEMA_DB_URL"));
        registry.add("spring.datasource.username", () -> System.getenv("ESQUEMA_DB_USER"));
        registry.add("spring.datasource.password", () -> System.getenv("ESQUEMA_DB_PASSWORD"));
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Test
    void lasEntidadesCoincidenConElEsquemaDeLosScripts() {
        // Si el contexto levantó, Hibernate validó todas las entidades contra la BD
    }
}
