import { useEffect, useState } from 'react';
import FiltroPeriodo from './FiltroPeriodo';
import { mensajeDeReporte, pedirReporte, periodoDelMes } from '../../config/reportes';

const soles = (valor) =>
  `S/ ${Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (valor) => (valor === null ? '—' : `${valor} %`);
// "2026-10-08" → "08/10", sin pasar por Date para que la zona horaria no cambie el día
const diaMes = (fecha) => fecha.split('-').reverse().slice(0, 2).join('/');

function Cifra({ titulo, valor, detalle }) {
  return (
    <div style={styles.cifra}>
      <span style={styles.cifraTitulo}>{titulo}</span>
      <span style={styles.cifraValor}>{valor}</span>
      {detalle && <span style={styles.cifraDetalle}>{detalle}</span>}
    </div>
  );
}

// HU-23 (CA-23): ventas, costo de insumos, merma y margen bruto del periodo, en soles y en %
function PanelReporte({ token }) {
  const [periodo, setPeriodo] = useState(periodoDelMes);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    pedirReporte('panel/', token, periodo)
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

  const mayorVenta = datos ? Math.max(1, ...datos.semanas.map((s) => Number(s.ventas))) : 1;
  const variacion = datos?.anterior.variacion_ventas;

  return (
    <div>
      <FiltroPeriodo periodo={periodo} onCambiar={setPeriodo} />
      {error && <p style={styles.error}>{error}</p>}
      {datos && (
        <>
          <div style={styles.cifras}>
            <Cifra
              titulo="Ventas"
              valor={soles(datos.ventas)}
              detalle={variacion === null ? 'Sin ventas en el periodo anterior' : `${Number(variacion) > 0 ? '+' : ''}${variacion} % frente al periodo anterior`}
            />
            <Cifra titulo="Costo de insumos" valor={soles(datos.costo_insumos)} detalle={`${pct(datos.costo_porcentaje)} de las ventas`} />
            <Cifra titulo="Merma" valor={soles(datos.merma)} detalle={`${pct(datos.merma_porcentaje)} de las ventas`} />
            <Cifra titulo="Margen bruto" valor={soles(datos.margen)} detalle={`${pct(datos.margen_porcentaje)} de las ventas`} />
          </div>

          <h3 style={styles.subtitulo}>Ventas por semana</h3>
          <table style={styles.tabla}>
            <thead>
              <tr>
                <th style={styles.th}>Semana</th>
                <th style={styles.th}>Ventas</th>
                <th style={styles.thNum}>Costo de insumos</th>
              </tr>
            </thead>
            <tbody>
              {datos.semanas.map((s) => (
                <tr key={s.desde}>
                  <td style={styles.td}>
                    {diaMes(s.desde)} al {diaMes(s.hasta)}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.barraFila}>
                      <div style={{ ...styles.barra, width: `${(100 * Number(s.ventas)) / mayorVenta}%` }} />
                      <span style={styles.barraValor}>{soles(s.ventas)}</span>
                    </div>
                  </td>
                  <td style={styles.tdNum}>{soles(s.costo)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={styles.subtitulo}>Platillos más vendidos</h3>
          {datos.platillos.length === 0 ? (
            <p style={styles.ayuda}>No hay platillos servidos en este periodo.</p>
          ) : (
            <table style={styles.tabla}>
              <thead>
                <tr>
                  <th style={styles.th}>Platillo</th>
                  <th style={styles.thNum}>Vendidos</th>
                  <th style={styles.thNum}>Precio</th>
                  <th style={styles.thNum}>Costo</th>
                  <th style={styles.thNum}>% del precio</th>
                </tr>
              </thead>
              <tbody>
                {datos.platillos.map((p) => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.nombre}</td>
                    <td style={styles.tdNum}>{p.vendidos}</td>
                    <td style={styles.tdNum}>{soles(p.precio)}</td>
                    <td style={styles.tdNum}>{p.costo === null ? '—' : soles(p.costo)}</td>
                    <td style={styles.tdNum}>{pct(p.porcentaje_costo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  error: {
    padding: '10px 12px',
    backgroundColor: '#fce8e6',
    color: '#d93025',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #f5c6cb',
  },
  ayuda: { fontSize: '13px', color: '#5f6368' },
  cifras: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '24px' },
  cifra: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '14px 16px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dadce0',
    borderRadius: '6px',
  },
  cifraTitulo: { fontSize: '13px', color: '#5f6368' },
  cifraValor: { fontSize: '22px', color: '#202124', fontVariantNumeric: 'tabular-nums' },
  cifraDetalle: { fontSize: '12px', color: '#5f6368' },
  subtitulo: { fontSize: '16px', color: '#3c4043', margin: '0 0 10px 0' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '24px' },
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
  barraFila: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' },
  barra: { height: '10px', backgroundColor: '#1a73e8', borderRadius: '0 4px 4px 0', minWidth: '2px' },
  barraValor: { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#3c4043' },
};

export default PanelReporte;
