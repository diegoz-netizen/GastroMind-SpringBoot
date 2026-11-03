package com.gastromind.backendspring.repository;

import com.gastromind.backendspring.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * El restaurante del producto sale de su categoría: un producto de otro restaurante se trata como inexistente.
 */
@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {

    Optional<Producto> findByIdAndCategoriaRestauranteId(Long id, Long restauranteId);
}
