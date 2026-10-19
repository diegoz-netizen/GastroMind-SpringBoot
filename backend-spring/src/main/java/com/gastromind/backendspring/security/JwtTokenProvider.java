package com.gastromind.backendspring.security;

import com.gastromind.backendspring.config.JwtProperties;
import com.gastromind.backendspring.entity.Empleado;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.Map;

@Component
public class JwtTokenProvider {

    @Autowired
    private JwtProperties jwtProperties;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtProperties.getSecretBytes());
    }

    public String generarToken(Empleado empleado) {
        Date ahora = new Date();
        Date fechaExpiracion = new Date(ahora.getTime() + jwtProperties.getExpirationMs());

        return Jwts.builder()
                .setSubject(empleado.getCorreo())
                .claim("usuario_id", empleado.getId())
                .claim("rol_id", empleado.getRol().getId())
                .claim("restaurante_id", empleado.getRestaurante().getId())
                .claim("version_token", empleado.getVersionToken())
                .setIssuedAt(ahora)
                .setExpiration(fechaExpiracion)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Long getEmpleadoIdFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.get("usuario_id", Long.class);
    }

    public Integer getRolIdFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.get("rol_id", Integer.class);
    }

    public Long getRestauranteIdFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.get("restaurante_id", Long.class);
    }

    /** Tokens emitidos antes de HL-035 no traen el claim: cuentan como versión 0. */
    public int getVersionTokenFromToken(String token) {
        Integer version = getClaims(token).get("version_token", Integer.class);
        return version != null ? version : 0;
    }

    public String getCorreoFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.getSubject();
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
