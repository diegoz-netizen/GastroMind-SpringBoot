import { useState } from 'react';
import BotonExcel from './BotonExcel';
import FiltroPeriodo from './FiltroPeriodo';
import { periodoDelMes } from '../../config/reportes';

// HU-24 (CA-24): los reportes de inventario y merma en Excel. En las pestañas Merma y Teórico vs. real también hay
// un botón que baja el Excel con los filtros de esa pantalla (insumo y motivo incluidos).
function ExportarReporte({ token }) {
  const [periodo, setPeriodo] = useState(periodoDelMes);

  return (
    <div>
      <p style={styles.ayuda}>
        Cada Excel trae arriba el restaurante, el periodo y los filtros aplicados. Para filtrar la merma por insumo
        o motivo, usa el botón de la pestaña Merma.
      </p>

      <section style={styles.bloque}>
        <h3 style={styles.titulo}>Inventario</h3>
        <p style={styles.ayuda}>Stock de hoy de cada insumo, su mínimo y su valor. Resalta lo que está en el mínimo.</p>
        <BotonExcel token={token} tipo="inventario" params={{}} texto="Excel de inventario" />
      </section>

      <section style={styles.bloque}>
        <h3 style={styles.titulo}>Merma y consumo del periodo</h3>
        <FiltroPeriodo periodo={periodo} onCambiar={setPeriodo}>
          <BotonExcel token={token} tipo="merma" params={periodo} texto="Excel de merma" />
          <BotonExcel token={token} tipo="consumo" params={periodo} texto="Excel de teórico vs. real" />
        </FiltroPeriodo>
      </section>
    </div>
  );
}

const styles = {
  bloque: { marginBottom: '20px', padding: '16px', border: '1px solid #dadce0', borderRadius: '8px' },
  titulo: { margin: '0 0 8px 0', fontSize: '16px', color: '#3c4043' },
  ayuda: { margin: '0 0 12px 0', fontSize: '13px', color: '#5f6368' },
};

export default ExportarReporte;
