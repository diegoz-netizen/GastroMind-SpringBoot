package com.gastromind.backendspring.repository;

import com.gastromind.backendspring.entity.MotivoMerma;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MotivoMermaRepository extends JpaRepository<MotivoMerma, Long> {

    /** HU-17: los motivos que puede usar el restaurante: los globales y los suyos. */
    @Query("select m from MotivoMerma m where m.esGlobal = true or m.restaurante.id = :restauranteId order by m.id")
    List<MotivoMerma> disponibles(@Param("restauranteId") Long restauranteId);
}
