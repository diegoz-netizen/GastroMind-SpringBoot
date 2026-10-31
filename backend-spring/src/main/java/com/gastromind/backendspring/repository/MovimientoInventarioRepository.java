package com.gastromind.backendspring.repository;

import com.gastromind.backendspring.entity.MovimientoInventario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Solo InventarioService guarda movimientos; las búsquedas de "ya existe" evitan descontar dos veces. */
@Repository
public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Long> {

    boolean existsByPedidoDetalleIdAndIngredienteId(Long pedidoDetalleId, Long ingredienteId);

    boolean existsByRegistroIngresoId(Long registroIngresoId);

    boolean existsByRegistroMermaId(Long registroMermaId);

    List<MovimientoInventario> findByIngredienteIdOrderByFechaAscIdAsc(Long ingredienteId);
}
