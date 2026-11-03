package com.gastromind.backendspring.repository;

import com.gastromind.backendspring.entity.Pedido;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * El restaurante del pedido sale de su mesa: un pedido de otro restaurante se trata como inexistente.
 */
@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    // SELECT ... FOR UPDATE: dos cambios a la vez sobre el mismo pedido no se pisan
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Pedido> findWithLockByIdAndMesaRestauranteId(Long id, Long restauranteId);
}
