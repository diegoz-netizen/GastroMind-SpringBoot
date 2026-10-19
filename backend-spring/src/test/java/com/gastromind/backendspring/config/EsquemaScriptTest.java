package com.gastromind.backendspring.config;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * HL-037: toda entidad JPA debe tener su tabla en docs/script_database.sql.
 * Los tests usan H2 con ddl-auto=create-drop, así que una tabla que solo crea Hibernate
 * pasa los tests pero falla (500) en una BD creada desde los scripts del repo.
 */
class EsquemaScriptTest {

    private static final Path SCRIPT = Path.of("..", "docs", "script_database.sql");
    private static final Pattern CREATE_TABLE =
            Pattern.compile("CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(\\w+)", Pattern.CASE_INSENSITIVE);

    @Test
    void cadaEntidadTieneSuTablaEnScriptDatabase() throws IOException {
        Set<String> tablasDelScript = new TreeSet<>();
        Matcher m = CREATE_TABLE.matcher(Files.readString(SCRIPT));
        while (m.find()) {
            tablasDelScript.add(m.group(1).toLowerCase());
        }

        Set<String> faltan = new TreeSet<>();
        for (String tabla : tablasDeLasEntidades()) {
            if (!tablasDelScript.contains(tabla)) {
                faltan.add(tabla);
            }
        }

        assertTrue(faltan.isEmpty(), "Tablas de entidades JPA que no están en docs/script_database.sql: " + faltan
                + ". Agregarlas al script y a una migración en docs/migraciones/.");
    }

    private static Set<String> tablasDeLasEntidades() {
        ClassPathScanningCandidateComponentProvider escaner = new ClassPathScanningCandidateComponentProvider(false);
        escaner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));

        Set<String> tablas = new TreeSet<>();
        for (BeanDefinition bd : escaner.findCandidateComponents("com.gastromind.backendspring")) {
            Class<?> clase = cargar(bd.getBeanClassName());
            Table table = clase.getAnnotation(Table.class);
            tablas.add(table != null && !table.name().isBlank() ? table.name().toLowerCase() : clase.getSimpleName().toLowerCase());
        }
        assertTrue(!tablas.isEmpty(), "No se encontraron entidades JPA: revisar el paquete escaneado");
        return tablas;
    }

    private static Class<?> cargar(String nombre) {
        try {
            return Class.forName(nombre);
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException(e);
        }
    }
}
