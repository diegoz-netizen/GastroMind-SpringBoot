package com.gastromind.backendspring.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * HU-04: configuración del enlace de recuperación.
 * expiracionMinutos: 15 (CA-04, decidido el 12/10). Se cambia solo en properties.
 * HU-01-b: expiracionBienvenidaHoras, plazo del enlace del correo de bienvenida para crear la contraseña (24 h).
 * HL-035: en /recuperar, máximo de solicitudes por correo y por IP dentro de la ventana (en minutos).
 */
@Configuration
@ConfigurationProperties(prefix = "gastromind.recuperacion")
public class RecuperacionProperties {

    private long expiracionMinutos = 15;
    private long expiracionBienvenidaHoras = 24;
    private String urlRestablecer = "http://localhost:5173/restablecer";
    private String remitente = "no-responder@gastromind.demo";
    private int maxPorCorreo = 3;
    private int maxPorIp = 10;
    private long ventanaLimiteMinutos = 15;

    public long getExpiracionMinutos() {
        return expiracionMinutos;
    }

    public void setExpiracionMinutos(long expiracionMinutos) {
        this.expiracionMinutos = expiracionMinutos;
    }

    public long getExpiracionBienvenidaHoras() {
        return expiracionBienvenidaHoras;
    }

    public void setExpiracionBienvenidaHoras(long expiracionBienvenidaHoras) {
        this.expiracionBienvenidaHoras = expiracionBienvenidaHoras;
    }

    public String getUrlRestablecer() {
        return urlRestablecer;
    }

    public void setUrlRestablecer(String urlRestablecer) {
        this.urlRestablecer = urlRestablecer;
    }

    public String getRemitente() {
        return remitente;
    }

    public void setRemitente(String remitente) {
        this.remitente = remitente;
    }

    public int getMaxPorCorreo() {
        return maxPorCorreo;
    }

    public void setMaxPorCorreo(int maxPorCorreo) {
        this.maxPorCorreo = maxPorCorreo;
    }

    public int getMaxPorIp() {
        return maxPorIp;
    }

    public void setMaxPorIp(int maxPorIp) {
        this.maxPorIp = maxPorIp;
    }

    public long getVentanaLimiteMinutos() {
        return ventanaLimiteMinutos;
    }

    public void setVentanaLimiteMinutos(long ventanaLimiteMinutos) {
        this.ventanaLimiteMinutos = ventanaLimiteMinutos;
    }
}
