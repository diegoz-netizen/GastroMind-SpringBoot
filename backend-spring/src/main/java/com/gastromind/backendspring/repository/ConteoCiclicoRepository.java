package com.gastromind.backendspring.repository;

import com.gastromind.backendspring.entity.ConteoCiclico;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConteoCiclicoRepository extends JpaRepository<ConteoCiclico, Long> {

    /** HU-30: los conteos de un insumo del restaurante, los más nuevos primero. */
    @EntityGraph(attributePaths = {"ingrediente", "empleado"})
    List<ConteoCiclico> findTop20ByIngredienteIdAndIngredienteRestauranteIdOrderByFechaRegistroDescIdDesc(
            Long ingredienteId, Long restauranteId);
}
