package com.gastromind.backendspring.repository;

import com.gastromind.backendspring.entity.RegistroIngresoProveedor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RegistroIngresoProveedorRepository extends JpaRepository<RegistroIngresoProveedor, Long> {

    /** HU-14: compras del restaurante, las más nuevas primero (el restaurante sale del insumo). */
    @EntityGraph(attributePaths = {"proveedor", "ingrediente", "empleado"})
    List<RegistroIngresoProveedor> findByIngredienteRestauranteIdOrderByFechaRegistroDescIdDesc(Long restauranteId);
}
