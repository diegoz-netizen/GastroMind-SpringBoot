package com.gastromind.backendspring.repository;

import com.gastromind.backendspring.entity.Mesa;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Todas las consultas reciben el restauranteId (obtenido con EmpleadoActual, nunca del cliente):
 * una mesa de otro restaurante se trata como inexistente.
 */
@Repository
public interface MesaRepository extends JpaRepository<Mesa, Long> {

    // SELECT ... FOR UPDATE: dos mozos a la vez no pueden tomar la misma mesa
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Mesa> findWithLockByIdAndRestauranteId(Long id, Long restauranteId);
}
