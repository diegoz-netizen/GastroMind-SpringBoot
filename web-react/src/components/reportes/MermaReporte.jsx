import { useEffect, useState } from 'react';
import axios from 'axios';
import BotonExcel from './BotonExcel';
import FiltroPeriodo from './FiltroPeriodo';
import { DJANGO_URL } from '../../config/api';
import { mensajeDeReporte, pedirReporte, periodoDelMes } from '../../config/reportes';

const INSUMOS_URL = `${DJANGO_URL}/api/catalogo/insumos/`;

// La API manda los números como texto; se muestran con el mismo formato que las demás pestañas
const cantidad = (valor) => Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 3 });
const porcentaje = (valor) => `${Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 1 })} %`;
const soles = (valor) =>
  `S/ ${Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// HU-19 (CA-19): la merma sobre el consumo total, en porcentaje, por periodo, insumo y motivo
function MermaReporte({ token }) {
  const [periodo, setPeriodo] = useState(periodoDelMes);
  const [filtro, setFiltro] = useState({ insumo: '', motivo: '' });
  const [insumos, setInsumos] = useState([]);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    axios
      .get(INSUMOS_URL, { headers: { Authorization: `Bearer ${token}` }, params: { ordering: 'nombre' } })
      .then((respuesta) => vigente && setInsumos(respuesta.data))
      .catch((err) => vigente && setError(mensajeDeReporte(err)));
    return () => {
      vigente = false;
    };
  }, [token]);

  useEffect(() => {
    let vigente = true;
    // Solo se mandan los filtros elegidos
    const params = { ...periodo };
    if (filtro.insumo) params.insumo = filtro.insumo;
    if (filtro.motivo) params.motivo = filtro.motivo;
    pedirReporte('merma/', token, params)
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
  }, [token, periodo, filtro]);

  const cambiar = (e) => setFiltro({ ...filtro, [e.target.name]: e.target.value });
  // HU-24: el Excel lleva los mismos filtros que se ven
  const filtrosExcel = { ...periodo };
  if (filtro.insumo) filtrosExcel.insumo = filtro.insumo;
  if (filtro.motivo) filtrosExcel.motivo = filtro.motivo;

  return (
    <div>
      <FiltroPeriodo periodo={periodo} onCambiar={setPeriodo}>
        <label style={styles.campo}>
          Insumo
          <select name="insumo" value={filtro.insumo} onChange={cambiar} style={styles.input}>
            <option value="">Todos</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.campo}>
          Motivo
          <select name="motivo" value={filtro.motivo} onChange={cambiar} style={styles.input}>
            <option value="">Todos</option>
            {(datos?.motivos_disponibles ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <BotonExcel token={token} tipo="merma" params={filtrosExcel} />
      </FiltroPeriodo>
      <p style={styles.ayuda}>
        Merma sobre el consumo total: lo que se perdió frente a todo lo que salió del almacén (consumo y merma). El
        total va en soles, porque cada insumo tiene su unidad.
      </p>
      {error && <p style={styles.error}>{error}</p>}

      {datos && (
        <div style={styles.resumen}>
          <div>
            <div style={styles.cifra}>{porcentaje(datos.total.porcentaje)}</div>
            <div style={styles.ayuda}>de merma en el periodo</div>
          </div>
          <div>
            <div style={styles.cifraChica}>{soles(datos.total.costo_merma)}</div>
            <div style={styles.ayuda}>perdidos de {soles(datos.total.costo_consumo)} que salieron</div>
          </div>
        </div>
      )}

      {datos && datos.filas.length === 0 && <p style={styles.ayuda}>No hay salidas del almacén en este periodo.</p>}
      {datos && datos.filas.length > 0 && (
        <table style={styles.tabla}>
          <thead>
            <tr>
              <th style={styles.th}>Insumo</th>
              <th style={styles.thNum}>Consumo total</th>
              <th style={styles.thNum}>Merma</th>
              <th style={styles.thNum}>% merma</th>
              <th style={styles.thNum}>Costo de la merma</th>
            </tr>
          </thead>
          <tbody>
            {datos.filas.map((fila) => (
              <tr key={fila.id}>
                <td style={styles.td}>
                  {fila.insumo} <span style={styles.unidad}>({fila.unidad})</span>
                </td>
                <td style={styles.tdNum}>{cantidad(fila.consumo)}</td>
                <td style={styles.tdNum}>{cantidad(fila.merma)}</td>
                <td style={styles.tdNum}>{porcentaje(fila.porcentaje)}</td>
                <td style={styles.tdNum}>{soles(fila.costo_merma)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {datos && datos.motivos.length > 0 && (
        <>
          <h3 style={styles.subtitulo}>Por motivo</h3>
          <table style={styles.tabla}>
            <thead>
              <tr>
                <th style={styles.th}>Motivo</th>
                <th style={styles.thNum}>Costo</th>
                <th style={styles.thNum}>% de la merma</th>
              </tr>
            </thead>
            <tbody>
              {datos.motivos.map((m) => (
                <tr key={m.motivo}>
                  <td style={styles.td}>{m.motivo}</td>
                  <td style={styles.tdNum}>{soles(m.costo)}</td>
                  <td style={styles.tdNum}>{porcentaje(m.porcentaje)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const styles = {
  campo: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#5f6368' },
  input: { padding: '8px 10px', fontSize: '14px', border: '1px solid #dadce0', borderRadius: '4px' },
  ayuda: { fontSize: '13px', color: '#5f6368', margin: '0 0 12px 0' },
  error: {
    padding: '10px 12px',
    backgroundColor: '#fce8e6',
    color: '#d93025',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #f5c6cb',
  },
  resumen: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '32px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid #dadce0',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
  },
  cifra: { fontSize: '28px', fontWeight: '600', color: '#d93025' },
  cifraChica: { fontSize: '22px', fontWeight: '500', color: '#3c4043' },
  subtitulo: { fontSize: '16px', fontWeight: '500', color: '#3c4043', margin: '24px 0 8px 0' },
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
};

export default MermaReporte;
