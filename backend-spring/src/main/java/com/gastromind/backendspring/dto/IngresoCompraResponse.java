package com.gastromind.backendspring.dto;

import com.gastromind.backendspring.entity.RegistroIngresoProveedor;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * HU-14: una compra registrada. stockResultante solo viene al registrarla (POST): es el saldo
 * que dejó su movimiento; en el listado va null porque el stock ya pudo moverse después.
 */
@Getter
@AllArgsConstructor
@Builder
public class IngresoCompraResponse {
    private Long id;
    private Long proveedorId;
    private String proveedor;
    private Long ingredienteId;
    private String insumo;
    private String unidadMedida;
    private BigDecimal cantidad;
    private BigDecimal costoTotal;
    private String lote;
    private LocalDate fechaVencimiento;
    private LocalDateTime fechaRegistro;
    private String registradoPor;
    private BigDecimal stockResultante;

    public static IngresoCompraResponse from(RegistroIngresoProveedor registro, BigDecimal stockResultante) {
        return IngresoCompraResponse.builder()
                .id(registro.getId())
                .proveedorId(registro.getProveedor().getId())
                .proveedor(registro.getProveedor().getNombre())
                .ingredienteId(registro.getIngrediente().getId())
                .insumo(registro.getIngrediente().getNombre())
                .unidadMedida(registro.getIngrediente().getUnidadMedida())
                .cantidad(registro.getCantidadRecibida())
                .costoTotal(registro.getCostoTotal())
                .lote(registro.getLote())
                .fechaVencimiento(registro.getFechaVencimiento())
                .fechaRegistro(registro.getFechaRegistro())
                .registradoPor(registro.getEmpleado().getNombreCompleto())
                .stockResultante(stockResultante)
                .build();
    }
}
