package com.gastromind.backendspring.repository;

import com.gastromind.backendspring.entity.RecetaDetalle;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecetaDetalleRepository extends JpaRepository<RecetaDetalle, Long> {

    // Siempre en el mismo orden: dos platillos servidos a la vez bloquean sus insumos sin cruzarse (deadlock)
    @EntityGraph(attributePaths = "ingrediente")
    List<RecetaDetalle> findByProductoIdOrderByIngredienteIdAsc(Long productoId);
}
