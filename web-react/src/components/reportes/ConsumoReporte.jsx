import { useEffect, useState } from 'react';
import FiltroPeriodo from './FiltroPeriodo';
import { mensajeDeReporte, pedirReporte, periodoDelMes } from '../../config/reportes';

// "0.400" → "0,400": la API manda las cantidades como texto
const cantidad = (valor) => Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 3 });
const conSigno = (valor) => (Number(valor) > 0 ? '+' : '') + cantidad(valor);

// HU-20 (CA-20): lo que debió salir según las recetas contra lo que salió del almacén
function ConsumoReporte({ token }) {
  const [periodo, setPeriodo] = useState(periodoDelMes);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    pedirReporte('consumo/', token, periodo)
      .then((respuesta) => {
        if (vigente) {
          setDatos(respuesta);
          setError('');
        }
      })
      .catch((err) => vigente && setError(mensajeDeReporte(err)));
    return () => {
      vigente = false;
    };
  }, [token, periodo]);

  return (
    <div>
      <FiltroPeriodo periodo={periodo} onCambiar={setPeriodo} />
      <p style={styles.ayuda}>
        Teórico: platillos servidos × su receta. Real: lo que salió del almacén (consumo y merma). Se resaltan las
        diferencias mayores a {datos?.umbral ?? 5} %.
      </p>
      {error && <p style={styles.error}>{error}</p>}
      {datos && datos.filas.length === 0 && <p style={styles.ayuda}>No hay ventas ni salidas en este periodo.</p>}
      {datos && datos.filas.length > 0 && (
        <table style={styles.tabla}>
          <thead>
            <tr>
              <th style={styles.th}>Insumo</th>
              <th style={styles.thNum}>Teórico</th>
              <th style={styles.thNum}>Real</th>
              <th style={styles.thNum}>Diferencia</th>
              <th style={styles.thNum}>%</th>
            </tr>
          </thead>
          <tbody>
            {datos.filas.map((fila) => (
              <tr key={fila.id} style={fila.resaltar ? styles.resaltada : undefined}>
                <td style={styles.td}>
                  {fila.insumo} <span style={styles.unidad}>({fila.unidad})</span>
                </td>
                <td style={styles.tdNum}>{cantidad(fila.teorico)}</td>
                <td style={styles.tdNum}>{cantidad(fila.real)}</td>
                <td style={styles.tdNum}>{conSigno(fila.diferencia)}</td>
                <td style={styles.tdNum}>
                  {fila.porcentaje === null ? '—' : `${Number(fila.porcentaje) > 0 ? '+' : ''}${fila.porcentaje} %`}
                  {fila.resaltar && <span style={styles.marca}>Revisar</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  ayuda: { fontSize: '13px', color: '#5f6368', margin: '0 0 12px 0' },
  error: {
    padding: '10px 12px',
    backgroundColor: '#fce8e6',
    color: '#d93025',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #f5c6cb',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #dadce0', color: '#5f6368', fontWeight: '500' },
  thNum: { textAlign: 'right', padding: '10px 8px', borderBottom: '2px solid #dadce0', color: '#5f6368', fontWeight: '500' },
  td: { padding: '10px 8px', borderBottom: '1px solid #f1f3f4', color: '#3c4043' },
  tdNum: {
    padding: '10px 8px',
    borderBottom: '1px solid #f1f3f4',
    color: '#3c4043',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  unidad: { color: '#5f6368', fontSize: '12px' },
  resaltada: { backgroundColor: '#fef7e0' },
  marca: {
    marginLeft: '8px',
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#fce8e6',
    color: '#d93025',
    fontSize: '12px',
  },
};

export default ConsumoReporte;
