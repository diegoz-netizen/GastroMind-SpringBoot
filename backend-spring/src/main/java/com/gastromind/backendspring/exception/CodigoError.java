package com.gastromind.backendspring.exception;

import org.springframework.http.HttpStatusCode;

/**
 * HL-014: el campo "error" sale del código HTTP. Los mismos códigos usa Django (config/errores.py),
 * así React y Kotlin tratan igual las respuestas de los dos backends.
 */
public final class CodigoError {

    public static final String VALIDACION = "VALIDACION";
    public static final String SOLICITUD_INVALIDA = "SOLICITUD_INVALIDA";
    public static final String NO_AUTENTICADO = "NO_AUTENTICADO";
    public static final String SIN_PERMISO = "SIN_PERMISO";
    public static final String NO_ENCONTRADO = "NO_ENCONTRADO";
    public static final String METODO_NO_PERMITIDO = "METODO_NO_PERMITIDO";
    public static final String CONFLICTO = "CONFLICTO";
    public static final String DEMASIADAS_SOLICITUDES = "DEMASIADAS_SOLICITUDES";
    public static final String ERROR_INTERNO = "ERROR_INTERNO";

    private CodigoError() {
    }

    public static String desde(HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> SOLICITUD_INVALIDA;
            case 401 -> NO_AUTENTICADO;
            case 403 -> SIN_PERMISO;
            case 404 -> NO_ENCONTRADO;
            case 405 -> METODO_NO_PERMITIDO;
            case 409 -> CONFLICTO;
            case 429 -> DEMASIADAS_SOLICITUDES;
            default -> status.is5xxServerError() ? ERROR_INTERNO : SOLICITUD_INVALIDA;
        };
    }
}
