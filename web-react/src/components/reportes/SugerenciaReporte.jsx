import { useEffect, useState } from 'react';
import { mensajeDeReporte, pedirReporte } from '../../config/reportes';

// Las cantidades llegan como texto ("11.200"); se muestran con coma, como en el resto de los reportes
const cantidad = (valor, decimales = 3) =>
  Number(valor).toLocaleString('es-PE', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
const soles = (valor) => `S/ ${cantidad(valor, 2)}`;
const fecha = (iso) => iso.split('-').reverse().join('/');

// "12,5" o "12.5" → "12.5"; vacío o inválido → null
const leerCantidad = (texto) => {
  const limpio = String(texto).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(limpio)) return null;
  return limpio;
};

// HU-21 (CA-21): qué comprar para los próximos días, con el periodo analizado y la cantidad ajustable
function SugerenciaReporte({ token }) {
  const [parametros, setParametros] = useState({ dias: 7, semanas: 8 });
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  // Lo que el gerente cambió a mano, por insumo: { [id]: { texto, proveedor, error } }
  const [ajustes, setAjustes] = useState({});

  useEffect(() => {
    let vigente = true;
    pedirReporte('sugerencia/', token, parametros)
      .then((respuesta) => {
        if (vigente) {
          setDatos(respuesta);
          setAjustes({});
          setError('');
        }
      })
      .catch((err) => vigente && setError(mensajeDeReporte(err)));
    return () => {
      vigente = false;
    };
  }, [token, parametros]);

  const cambiarParametro = (e) => {
    const valor = Number(e.target.value);
    if (Number.isInteger(valor) && valor >= Number(e.target.min) && valor <= Number(e.target.max)) {
      setParametros((p) => ({ ...p, [e.target.name]: valor }));
    }
  };

  // CA-21 "se puede ajustar": al cambiar la cantidad se vuelve a buscar el proveedor más barato para esa cantidad
  const ajustar = (fila, texto) => {
    setAjustes((a) => ({ ...a, [fila.id]: { ...a[fila.id], texto, error: '' } }));
    const valor = leerCantidad(texto);
    if (valor === null) {
      setAjustes((a) => ({ ...a, [fila.id]: { ...a[fila.id], error: 'Cantidad no válida (hasta 3 decimales).' } }));
      return;
    }
    if (Number(valor) === 0) {
      setAjustes((a) => ({ ...a, [fila.id]: { texto, proveedor: null, error: '' } }));
      return;
    }
    pedirReporte('proveedores/', token, { insumo: fila.id, cantidad: valor })
      .then((respuesta) => {
        setAjustes((a) =>
          // Solo si sigue siendo lo último que se escribió
          a[fila.id]?.texto === texto
            ? { ...a, [fila.id]: { texto, proveedor: respuesta.opciones[0] ?? null, error: '' } }
            : a,
        );
      })
      .catch((err) => setAjustes((a) => ({ ...a, [fila.id]: { ...a[fila.id], error: mensajeDeReporte(err) } })));
  };

  const filas = (datos?.filas ?? []).map((fila) => {
    const ajuste = ajustes[fila.id];
    return {
      ...fila,
      texto: ajuste?.texto ?? cantidad(fila.comprar, 0),
      ajustada: ajuste !== undefined,
      proveedorFinal: ajuste && 'proveedor' in ajuste ? ajuste.proveedor : fila.proveedor,
      errorAjuste: ajuste?.error,
    };
  });
  const aComprar = filas.filter((f) => (f.ajustada ? Number(leerCantidad(f.texto) ?? 0) : Number(f.comprar)) > 0);
  const total = aComprar.reduce((suma, f) => suma + Number(f.proveedorFinal?.costo_total ?? 0), 0);
  const sinProveedor = aComprar.filter((f) => !f.proveedorFinal).length;

  return (
    <div>
      <div style={styles.filtros}>
        <label style={styles.campo}>
          Días a cubrir
          <input type="number" name="dias" min="1" max="60" defaultValue={parametros.dias}
            onChange={cambiarParametro} style={styles.input} />
        </label>
        <label style={styles.campo}>
          Semanas de historial
          <input type="number" name="semanas" min="1" max="52" defaultValue={parametros.semanas}
            onChange={cambiarParametro} style={styles.input} />
        </label>
        {datos && (
          <p style={styles.periodo}>
            Periodo analizado: <strong>{fecha(datos.desde)} al {fecha(datos.hasta)}</strong>
          </p>
        )}
      </div>
      <p style={styles.ayuda}>
        Previsto = consumo diario de los platillos servidos (las 2 últimas semanas pesan más) × días a cubrir × la
        temporada (cómo cambió el consumo en esas mismas fechas el año pasado). Comprar = previsto + stock mínimo −
        stock. Solo insumos por receta. Puedes cambiar la cantidad: el proveedor se recalcula.
      </p>
      {error && <p style={styles.error}>{error}</p>}
      {datos && filas.length === 0 && <p style={styles.ayuda}>No hay insumos por receta registrados.</p>}
      {filas.length > 0 && (
        <table style={styles.tabla}>
          <thead>
            <tr>
              <th style={styles.th}>Insumo</th>
              <th style={styles.thNum}>Stock</th>
              <th style={styles.thNum}>Mínimo</th>
              <th style={styles.thNum}>Consumo diario</th>
              <th style={styles.thNum}>Temporada</th>
              <th style={styles.thNum}>Previsto ({datos.dias} días)</th>
              <th style={styles.thNum}>Comprar</th>
              <th style={styles.th}>Proveedor sugerido</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id} style={Number(fila.comprar) > 0 ? styles.aComprar : undefined}>
                <td style={styles.td}>
                  {fila.insumo} <span style={styles.unidad}>({fila.unidad})</span>
                </td>
                <td style={styles.tdNum}>{cantidad(fila.stock)}</td>
                <td style={styles.tdNum}>{cantidad(fila.minimo)}</td>
                <td style={styles.tdNum}>{cantidad(fila.consumo_diario)}</td>
                <td style={styles.tdNum}>× {cantidad(fila.factor_temporada, 2)}</td>
                <td style={styles.tdNum}>{cantidad(fila.previsto)}</td>
                <td style={styles.tdNum}>
                  <input
                    aria-label={`Cantidad a comprar de ${fila.insumo}`}
                    value={fila.texto}
                    onChange={(e) => ajustar(fila, e.target.value)}
                    style={{ ...styles.inputCantidad, ...(fila.ajustada ? styles.inputAjustado : {}) }}
                  />
                  {fila.errorAjuste && <div style={styles.errorCampo}>{fila.errorAjuste}</div>}
                </td>
                <td style={styles.td}>
                  {fila.proveedorFinal ? (
                    <>
                      {fila.proveedorFinal.proveedor}
                      <div style={styles.detalle}>
                        {soles(fila.proveedorFinal.costo_total)} · {fila.proveedorFinal.tiempo_entrega_dias} d
                      </div>
                    </>
                  ) : (
                    <span style={styles.unidad}>{Number(fila.comprar) > 0 || fila.ajustada ? 'Sin precio registrado' : '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={styles.tdTotal} colSpan={7}>
                Total estimado ({aComprar.length} {aComprar.length === 1 ? 'insumo' : 'insumos'}
                {sinProveedor > 0 ? `, ${sinProveedor} sin precio` : ''})
              </td>
              <td style={styles.tdTotal}>{soles(total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

const styles = {
  filtros: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', marginBottom: '12px' },
  campo: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#5f6368' },
  input: { padding: '8px 10px', fontSize: '14px', border: '1px solid #dadce0', borderRadius: '4px', width: '110px' },
  periodo: { margin: '0 0 8px 8px', fontSize: '13px', color: '#3c4043' },
  ayuda: { fontSize: '13px', color: '#5f6368', margin: '0 0 12px 0' },
  error: {
    padding: '10px 12px',
    backgroundColor: '#fce8e6',
    color: '#d93025',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #f5c6cb',
  },
  errorCampo: { color: '#d93025', fontSize: '12px', marginTop: '4px', whiteSpace: 'normal' },
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
  tdTotal: {
    padding: '12px 8px',
    borderTop: '2px solid #dadce0',
    color: '#202124',
    fontWeight: '500',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  unidad: { color: '#5f6368', fontSize: '12px' },
  detalle: { color: '#5f6368', fontSize: '12px', marginTop: '2px' },
  aComprar: { backgroundColor: '#e6f4ea' },
  inputCantidad: {
    width: '72px',
    padding: '6px 8px',
    fontSize: '14px',
    textAlign: 'right',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    fontVariantNumeric: 'tabular-nums',
  },
  inputAjustado: { borderColor: '#1a73e8', backgroundColor: '#e8f0fe' },
};

export default SugerenciaReporte;
