package com.gastromind.backendspring.security;

import com.gastromind.backendspring.repository.EmpleadoRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final EmpleadoRepository empleadoRepository;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, EmpleadoRepository empleadoRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.empleadoRepository = empleadoRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String token = getTokenFromRequest(request);

        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            Long empleadoId = jwtTokenProvider.getEmpleadoIdFromToken(token);
            Long restauranteId = jwtTokenProvider.getRestauranteIdFromToken(token);

            int versionToken = jwtTokenProvider.getVersionTokenFromToken(token);

            // Un token valido no basta: el empleado debe seguir ACTIVO en la BD y el token debe ser
            // posterior a su ultimo cambio de contrasena (HL-035)
            boolean activo = empleadoId != null && empleadoRepository.findById(empleadoId)
                    .map(empleado -> "ACTIVO".equalsIgnoreCase(empleado.getEstado())
                            && versionToken == empleado.getVersionToken())
                    .orElse(false);

            if (activo) {
                List<SimpleGrantedAuthority> authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_empleado"),
                        new SimpleGrantedAuthority("ROLE_restaurante_" + restauranteId)
                );

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(empleadoId, null, authorities);

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
