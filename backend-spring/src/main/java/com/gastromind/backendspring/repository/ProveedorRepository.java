package com.gastromind.backendspring.repository;

import com.gastromind.backendspring.entity.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Todas las consultas reciben el restauranteId (obtenido con EmpleadoActual, nunca del cliente):
 * un proveedor de otro restaurante se trata como inexistente.
 */
@Repository
public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {

    List<Proveedor> findByRestauranteIdOrderByNombreAsc(Long restauranteId);

    Optional<Proveedor> findByIdAndRestauranteId(Long id, Long restauranteId);
}
