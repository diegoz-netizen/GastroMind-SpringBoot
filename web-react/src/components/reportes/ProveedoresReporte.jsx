import { useEffect, useState } from 'react';
import axios from 'axios';
import { DJANGO_URL } from '../../config/api';
import { mensajeDeReporte, pedirReporte } from '../../config/reportes';

const PROVEEDORES_URL = `${DJANGO_URL}/api/catalogo/proveedores/`;
const INSUMOS_URL = `${DJANGO_URL}/api/catalogo/insumos/`;
const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const soles = (valor) =>
  `S/ ${Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dias = (n) => (Number(n) === 1 ? '1 día' : `${n} días`);

// Errores por campo de la API (formato VALIDACION); el resto va como mensaje general
const erroresDe = (err) => (err.response?.data?.error === 'VALIDACION' ? err.response.data.campos || {} : null);

function Campo({ etiqueta, error, children }) {
  return (
    <label style={styles.label}>
      {etiqueta}
      {children}
      {error && <span style={styles.fieldError}>{error}</span>}
    </label>
  );
}

// Alta de un proveedor: nombre y contacto
function NuevoProveedor({ token, onGuardado }) {
  const [datos, setDatos] = useState({ nombre: '', contacto: '' });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
    setErrores({ ...errores, [e.target.name]: undefined });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const respuesta = await axios.post(PROVEEDORES_URL, datos, conToken(token));
      setDatos({ nombre: '', contacto: '' });
      setErrores({});
      onGuardado(`Proveedor "${respuesta.data.nombre}" registrado.`);
    } catch (err) {
      const campos = erroresDe(err);
      if (campos) setErrores(campos);
      else setError(mensajeDeReporte(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} style={styles.form} noValidate>
      <h3 style={styles.formTitle}>Nuevo proveedor</h3>
      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.grid}>
        <Campo etiqueta="Nombre *" error={errores.nombre}>
          <input name="nombre" value={datos.nombre} onChange={cambiar} maxLength={150} style={styles.input} />
        </Campo>
        <Campo etiqueta="Contacto" error={errores.contacto}>
          <input name="contacto" value={datos.contacto} onChange={cambiar} maxLength={150}
            placeholder="Teléfono o correo" style={styles.input} />
        </Campo>
      </div>
      <button type="submit" disabled={guardando}
        style={{ ...styles.primaryButton, ...(guardando ? styles.buttonDisabled : {}) }}>
        {guardando ? 'Guardando...' : 'Registrar proveedor'}
      </button>
    </form>
  );
}

// Precio de un insumo con un proveedor; si ya tenía uno, la API lo reemplaza
function PrecioInsumo({ token, proveedores, insumos, onGuardado }) {
  const vacio = { proveedor: '', insumo_id: '', precio_unitario: '', tiempo_entrega_dias: '', flete: '0' };
  const [datos, setDatos] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
    setErrores({ ...errores, [e.target.name]: undefined });
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!datos.proveedor) {
      setErrores({ proveedor: 'Elige el proveedor.' });
      return;
    }
    setGuardando(true);
    setError('');
    const { proveedor, ...cuerpo } = datos;
    try {
      const respuesta = await axios.post(`${PROVEEDORES_URL}${proveedor}/precios/`, cuerpo, conToken(token));
      setDatos(vacio);
      setErrores({});
      onGuardado(`Precio de ${respuesta.data.insumo} guardado.`);
    } catch (err) {
      const campos = erroresDe(err);
      if (campos) setErrores(campos);
      else setError(mensajeDeReporte(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} style={styles.form} noValidate>
      <h3 style={styles.formTitle}>Precio de un insumo</h3>
      <p style={styles.ayuda}>Si el proveedor ya tenía precio para ese insumo, se reemplaza.</p>
      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.grid}>
        <Campo etiqueta="Proveedor *" error={errores.proveedor}>
          <select name="proveedor" value={datos.proveedor} onChange={cambiar} style={styles.input}>
            <option value="">Elige...</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Insumo *" error={errores.insumo_id}>
          <select name="insumo_id" value={datos.insumo_id} onChange={cambiar} style={styles.input}>
            <option value="">Elige...</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Precio unitario (S/) *" error={errores.precio_unitario}>
          <input name="precio_unitario" type="number" step="0.01" min="0.01" value={datos.precio_unitario}
            onChange={cambiar} style={styles.input} />
        </Campo>
        <Campo etiqueta="Entrega (días) *" error={errores.tiempo_entrega_dias}>
          <input name="tiempo_entrega_dias" type="number" step="1" min="0" value={datos.tiempo_entrega_dias}
            onChange={cambiar} style={styles.input} />
        </Campo>
        <Campo etiqueta="Flete (S/)" error={errores.flete}>
          <input name="flete" type="number" step="0.01" min="0" value={datos.flete} onChange={cambiar}
            style={styles.input} />
        </Campo>
      </div>
      <button type="submit" disabled={guardando}
        style={{ ...styles.primaryButton, ...(guardando ? styles.buttonDisabled : {}) }}>
        {guardando ? 'Guardando...' : 'Guardar precio'}
      </button>
    </form>
  );
}

// CA-22: con dos proveedores del mismo insumo, el de menor costo total (precio × cantidad + flete)
function Comparar({ token, insumos }) {
  const [consulta, setConsulta] = useState({ insumo: '', cantidad: '1' });
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  const cambiar = (e) => setConsulta({ ...consulta, [e.target.name]: e.target.value });

  const comparar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setDatos(await pedirReporte('proveedores/', token, consulta));
    } catch (err) {
      setDatos(null);
      const campos = erroresDe(err);
      setError(campos ? Object.values(campos)[0] : mensajeDeReporte(err));
    }
  };

  return (
    <form onSubmit={comparar} style={styles.form} noValidate>
      <h3 style={styles.formTitle}>¿A quién le compro?</h3>
      <p style={styles.ayuda}>
        Se sugiere el de menor costo total: precio × cantidad + flete. Si empatan, el que entrega antes.
      </p>
      <div style={styles.grid}>
        <Campo etiqueta="Insumo">
          <select name="insumo" value={consulta.insumo} onChange={cambiar} style={styles.input}>
            <option value="">Elige...</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Cantidad">
          <input name="cantidad" type="number" step="0.001" min="0.001" value={consulta.cantidad} onChange={cambiar}
            style={styles.input} />
        </Campo>
      </div>
      <button type="submit" style={styles.primaryButton}>Comparar</button>
      {error && <p style={{ ...styles.error, marginTop: '12px' }}>{error}</p>}
      {datos && datos.opciones.length === 0 && (
        <p style={{ ...styles.ayuda, marginTop: '12px' }}>Ningún proveedor tiene precio para {datos.insumo}.</p>
      )}
      {datos && datos.opciones.length > 0 && (
        <table style={{ ...styles.tabla, marginTop: '16px' }}>
          <thead>
            <tr>
              <th style={styles.th}>Proveedor</th>
              <th style={styles.thNum}>Precio</th>
              <th style={styles.thNum}>Flete</th>
              <th style={styles.thNum}>Entrega</th>
              <th style={styles.thNum}>Total por {datos.cantidad} {datos.unidad}</th>
            </tr>
          </thead>
          <tbody>
            {datos.opciones.map((o) => (
              <tr key={o.proveedor_id} style={o.sugerido ? styles.sugerida : undefined}>
                <td style={styles.td}>
                  {o.proveedor}
                  {o.sugerido && <span style={styles.marca}>Menor costo</span>}
                </td>
                <td style={styles.tdNum}>{soles(o.precio_unitario)}</td>
                <td style={styles.tdNum}>{soles(o.flete)}</td>
                <td style={styles.tdNum}>{dias(o.tiempo_entrega_dias)}</td>
                <td style={styles.tdNum}>{soles(o.costo_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </form>
  );
}

// HU-22: proveedores con sus precios y tiempo de entrega, y el de menor costo total (CA-22)
function ProveedoresReporte({ token }) {
  const [proveedores, setProveedores] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  // Sube en cada guardado para volver a leer los proveedores
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      axios.get(PROVEEDORES_URL, conToken(token)),
      axios.get(INSUMOS_URL, { ...conToken(token), params: { ordering: 'nombre' } }),
    ])
      .then(([respProveedores, respInsumos]) => {
        if (vigente) {
          setProveedores(respProveedores.data);
          setInsumos(respInsumos.data);
          setError('');
        }
      })
      .catch((err) => vigente && setError(mensajeDeReporte(err)));
    return () => {
      vigente = false;
    };
  }, [token, version]);

  const alGuardar = (mensaje) => {
    setExito(mensaje);
    setVersion((v) => v + 1);
  };

  return (
    <div>
      {error && <p style={styles.error}>{error}</p>}
      {exito && <p style={styles.success}>{exito}</p>}

      <Comparar token={token} insumos={insumos} />

      <h3 style={styles.subtitulo}>Proveedores y precios</h3>
      {proveedores.length === 0 ? (
        <p style={styles.ayuda}>Todavía no hay proveedores registrados.</p>
      ) : (
        <table style={styles.tabla}>
          <thead>
            <tr>
              <th style={styles.th}>Proveedor</th>
              <th style={styles.th}>Insumo</th>
              <th style={styles.thNum}>Precio</th>
              <th style={styles.thNum}>Flete</th>
              <th style={styles.thNum}>Entrega</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) =>
              (p.precios.length ? p.precios : [null]).map((precio, i) => (
                <tr key={`${p.id}-${precio?.id ?? 'sin'}`}>
                  <td style={styles.td}>
                    {i === 0 && (
                      <>
                        {p.nombre}
                        {p.contacto && <div style={styles.unidad}>{p.contacto}</div>}
                      </>
                    )}
                  </td>
                  {precio ? (
                    <>
                      <td style={styles.td}>
                        {precio.insumo} <span style={styles.unidad}>({precio.unidad})</span>
                      </td>
                      <td style={styles.tdNum}>{soles(precio.precio_unitario)}</td>
                      <td style={styles.tdNum}>{soles(precio.flete)}</td>
                      <td style={styles.tdNum}>{dias(precio.tiempo_entrega_dias)}</td>
                    </>
                  ) : (
                    <td style={styles.td} colSpan={4}>
                      <span style={styles.unidad}>Sin precios todavía</span>
                    </td>
                  )}
                </tr>
              )),
            )}
          </tbody>
        </table>
      )}

      <div style={styles.formularios}>
        <NuevoProveedor token={token} onGuardado={alGuardar} />
        <PrecioInsumo token={token} proveedores={proveedores} insumos={insumos} onGuardado={alGuardar} />
      </div>
    </div>
  );
}

const styles = {
  ayuda: { fontSize: '13px', color: '#5f6368', margin: '0 0 12px 0' },
  subtitulo: { margin: '8px 0 12px 0', fontSize: '16px', color: '#3c4043' },
  error: {
    margin: '0 0 12px 0',
    padding: '10px 12px',
    backgroundColor: '#fce8e6',
    color: '#d93025',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #f5c6cb',
  },
  success: {
    margin: '0 0 16px 0',
    padding: '10px 12px',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #ceead6',
  },
  formularios: { marginTop: '28px' },
  form: {
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #dadce0',
  },
  formTitle: { margin: '0 0 12px 0', fontSize: '16px', color: '#3c4043' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '14px',
    marginBottom: '16px',
  },
  label: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#5f6368' },
  input: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
  },
  fieldError: { fontSize: '12px', color: '#d93025' },
  primaryButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: '#1a73e8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#ffffff' },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #dadce0', color: '#5f6368', fontWeight: '500' },
  thNum: { textAlign: 'right', padding: '10px 8px', borderBottom: '2px solid #dadce0', color: '#5f6368', fontWeight: '500' },
  td: { padding: '10px 8px', borderBottom: '1px solid #f1f3f4', color: '#3c4043', verticalAlign: 'top' },
  tdNum: {
    padding: '10px 8px',
    borderBottom: '1px solid #f1f3f4',
    color: '#3c4043',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  unidad: { color: '#5f6368', fontSize: '12px' },
  sugerida: { backgroundColor: '#e6f4ea' },
  marca: {
    marginLeft: '8px',
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    fontSize: '12px',
    border: '1px solid #ceead6',
  },
};

export default ProveedoresReporte;
