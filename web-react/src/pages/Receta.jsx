import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { DJANGO_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

// La receta va en Django (catálogo), igual que la carta y los insumos
const API_PRODUCTOS = `${DJANGO_URL}/api/catalogo/productos/`;
const API_INSUMOS = `${DJANGO_URL}/api/catalogo/insumos/`;

const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const LINEA_VACIA = { ingrediente: '', cantidad_requerida: '' };

const soles = (monto) => `S/ ${Number(monto).toFixed(2)}`;

// HU-06: el gerente arma la receta (BOM) de un platillo: qué insumos lleva y cuánto de cada uno
function Receta() {
  const { id } = useParams();
  const [platillo, setPlatillo] = useState(null);
  const [insumos, setInsumos] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [erroresLinea, setErroresLinea] = useState({});
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const esAdmin = auth.rol?.toUpperCase() === 'ADMINISTRADOR';

  const mensajeDeError = (err) => {
    if (!err.response) {
      return 'No se pudo conectar con el servidor de Django. Verifica que esté corriendo en ' + DJANGO_URL;
    }
    const { status, data } = err.response;
    if (status === 401) return 'Tu sesión no es válida o tu cuenta está inactiva. Vuelve a iniciar sesión.';
    if (status === 403) return 'Solo un administrador puede modificar la receta.';
    if (status === 404) return 'El platillo no existe en tu restaurante.';
    return data?.mensaje || 'Ocurrió un error al procesar la solicitud.';
  };

  // Las líneas del formulario salen de la receta guardada
  const lineasDe = (producto) =>
    producto.detalles_receta.map((d) => ({
      ingrediente: String(d.ingrediente_id),
      cantidad_requerida: d.cantidad_requerida,
    }));

  useEffect(() => {
    const cargar = async () => {
      try {
        const [respReceta, respInsumos] = await Promise.all([
          axios.get(`${API_PRODUCTOS}${id}/receta/`, conToken(auth.token)),
          axios.get(API_INSUMOS, conToken(auth.token)),
        ]);
        setPlatillo(respReceta.data);
        setInsumos(respInsumos.data);
        setLineas(lineasDe(respReceta.data));
      } catch (err) {
        setError(mensajeDeError(err));
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id, auth.token]);

  const insumoDe = (ingredienteId) => insumos.find((i) => String(i.id) === String(ingredienteId));

  const limpiarMensajes = () => {
    setError('');
    setExito('');
    setErroresLinea({});
  };

  const cambiarLinea = (indice, campo, valor) => {
    setLineas((actuales) => actuales.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)));
    setErroresLinea((errores) => ({ ...errores, [indice]: undefined }));
    setExito('');
  };

  const agregarLinea = () => setLineas((actuales) => [...actuales, { ...LINEA_VACIA }]);

  const quitarLinea = (indice) => {
    setLineas((actuales) => actuales.filter((_, i) => i !== indice));
    setErroresLinea({});
    setExito('');
  };

  const descartarCambios = () => {
    limpiarMensajes();
    setLineas(lineasDe(platillo));
  };

  // Mismos chequeos que la API, para marcar la línea exacta antes de enviar
  const validar = () => {
    const errores = {};
    lineas.forEach((l, i) => {
      if (!l.ingrediente) errores[i] = 'Elige un insumo.';
      else if (!(Number(l.cantidad_requerida) > 0)) errores[i] = 'La cantidad debe ser mayor a cero.';
    });
    setErroresLinea(errores);
    if (lineas.length === 0) setError('La receta debe tener al menos un insumo.');
    return lineas.length > 0 && Object.keys(errores).length === 0;
  };

  const guardar = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    if (!validar()) return;
    setGuardando(true);

    try {
      // La API reemplaza la receta completa con estas líneas
      const detalles = lineas.map((l) => ({
        ingrediente: Number(l.ingrediente),
        cantidad_requerida: l.cantidad_requerida,
      }));
      const response = await axios.post(`${API_PRODUCTOS}${id}/receta/`, { detalles }, conToken(auth.token));
      setPlatillo(response.data);
      setLineas(lineasDe(response.data));
      setExito(`Receta de "${response.data.nombre}" guardada. El costo del platillo ya se actualizó en la carta.`);
    } catch (err) {
      // 400: Django devuelve {error: 'VALIDACION', mensaje, campos: {detalles: mensaje}} (HL-014)
      if (err.response?.data?.error === 'VALIDACION') {
        setError(err.response.data.campos?.detalles || err.response.data.mensaje);
      } else {
        setError(mensajeDeError(err));
      }
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSesion = () => {
    logout();
    navigate('/');
  };

  // Vista previa del costo con lo que está en pantalla; el oficial es el que calcula la API al guardar (HU-08)
  const costoLinea = (l) => {
    const insumo = insumoDe(l.ingrediente);
    return insumo && Number(l.cantidad_requerida) > 0 ? Number(l.cantidad_requerida) * Number(insumo.costo_unitario) : 0;
  };
  const costoEstimado = lineas.reduce((total, l) => total + costoLinea(l), 0);

  // Un insumo no se repite en la misma receta: en cada línea solo salen los que no usan las demás
  const insumosDisponibles = (indice) =>
    insumos
      .filter((i) => !lineas.some((l, j) => j !== indice && String(l.ingrediente) === String(i.id)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const editable = esAdmin && platillo?.requiere_receta;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Receta{platillo ? `: ${platillo.nombre}` : ''}</h1>
            <p style={styles.subtitle}>
              {auth.nombreCompleto} · {auth.rol}
            </p>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => navigate('/carta')} style={styles.secondaryButton}>
              Volver a la carta
            </button>
            <button onClick={cerrarSesion} style={styles.logoutButton}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {exito && <p style={styles.success}>{exito}</p>}

        {loading ? (
          <p style={styles.detail}>Cargando receta...</p>
        ) : (
          platillo && (
            <>
              <div style={styles.resumen}>
                <span>
                  {platillo.categoria_nombre} · Precio <strong>{soles(platillo.precio)}</strong>
                </span>
                {/* Review 2: el costo y el margen solo los ve el admin (la API ni los manda a los demás roles) */}
                {esAdmin && platillo.costo != null && (
                  <span>
                    Costo guardado <strong>{soles(platillo.costo)}</strong> · Margen{' '}
                    <strong style={Number(platillo.margen) < 0 ? styles.margenNegativo : undefined}>
                      {soles(platillo.margen)}
                    </strong>
                    {platillo.porcentaje_costo != null && ` (${platillo.porcentaje_costo} % en insumos)`}
                  </span>
                )}
              </div>

              {!platillo.requiere_receta ? (
                <p style={styles.detail}>
                  Este platillo no lleva receta (no descuenta insumos). Si debería llevarla, márcalo como
                  "Lleva receta" en la carta.
                </p>
              ) : insumos.length === 0 ? (
                <p style={styles.detail}>Tu restaurante no tiene insumos todavía; primero hay que registrarlos.</p>
              ) : (
                <form onSubmit={guardar} noValidate>
                  {lineas.length === 0 ? (
                    <p style={styles.faltaReceta}>
                      {editable ? 'El platillo todavía no tiene receta. Agrega sus insumos.' : 'El platillo todavía no tiene receta.'}
                    </p>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Insumo</th>
                          <th style={styles.thNum}>Cantidad</th>
                          <th style={styles.th}>Unidad</th>
                          {esAdmin && <th style={styles.thNum}>Costo unitario</th>}
                          {esAdmin && <th style={styles.thNum}>Subtotal</th>}
                          {editable && <th style={styles.th}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.map((linea, indice) => {
                          const insumo = insumoDe(linea.ingrediente);
                          return (
                            <tr key={indice}>
                              <td style={styles.td}>
                                {editable ? (
                                  <select value={linea.ingrediente}
                                    onChange={(e) => cambiarLinea(indice, 'ingrediente', e.target.value)}
                                    style={styles.input}>
                                    <option value="">Elige un insumo</option>
                                    {insumosDisponibles(indice).map((i) => (
                                      <option key={i.id} value={i.id}>
                                        {i.nombre}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  insumo?.nombre
                                )}
                                {erroresLinea[indice] && <span style={styles.fieldError}>{erroresLinea[indice]}</span>}
                              </td>
                              <td style={styles.tdNum}>
                                {editable ? (
                                  <input type="number" step="0.001" min="0.001" value={linea.cantidad_requerida}
                                    onChange={(e) => cambiarLinea(indice, 'cantidad_requerida', e.target.value)}
                                    style={{ ...styles.input, ...styles.inputCantidad }} />
                                ) : (
                                  Number(linea.cantidad_requerida)
                                )}
                              </td>
                              <td style={styles.td}>{insumo?.unidad_medida ?? '—'}</td>
                              {esAdmin && <td style={styles.tdNum}>{insumo ? soles(insumo.costo_unitario) : '—'}</td>}
                              {esAdmin && <td style={styles.tdNum}>{insumo ? soles(costoLinea(linea)) : '—'}</td>}
                              {editable && (
                                <td style={styles.tdAcciones}>
                                  <button type="button" onClick={() => quitarLinea(indice)} style={styles.dangerLink}>
                                    Quitar
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      {esAdmin && (
                      <tfoot>
                        <tr>
                          <td style={styles.tdTotal} colSpan={4}>
                            Costo estimado con esta receta
                          </td>
                          <td style={{ ...styles.tdNum, ...styles.tdTotal }}>{soles(costoEstimado)}</td>
                          {editable && <td style={styles.tdTotal}></td>}
                        </tr>
                      </tfoot>
                      )}
                    </table>
                  )}

                  {editable && (
                    <div style={styles.formButtons}>
                      <button type="button" onClick={agregarLinea}
                        disabled={lineas.length >= insumos.length} style={styles.secondaryButton}>
                        + Agregar insumo
                      </button>
                      <button type="submit" disabled={guardando}
                        style={{ ...styles.primaryButton, ...(guardando ? styles.buttonDisabled : {}) }}>
                        {guardando ? 'Guardando...' : 'Guardar receta'}
                      </button>
                      <button type="button" onClick={descartarCambios} style={styles.linkButton}>
                        Descartar cambios
                      </button>
                    </div>
                  )}
                </form>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '40px 20px',
  },
  card: {
    maxWidth: '1040px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    padding: '32px',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
    overflowX: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
  },
  headerButtons: {
    display: 'flex',
    gap: '8px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    color: '#1a73e8',
  },
  subtitle: {
    margin: 0,
    fontSize: '15px',
    color: '#5f6368',
  },
  resumen: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '16px',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#3c4043',
  },
  detail: {
    margin: '6px 0',
    fontSize: '14px',
    color: '#3c4043',
  },
  error: {
    margin: '0 0 16px 0',
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
  formButtons: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
  },
  input: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
  },
  inputCantidad: {
    width: '110px',
    textAlign: 'right',
  },
  fieldError: {
    display: 'block',
    marginTop: '4px',
    fontSize: '12px',
    color: '#d93025',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 8px',
    borderBottom: '2px solid #dadce0',
    color: '#5f6368',
    fontWeight: '500',
  },
  thNum: {
    textAlign: 'right',
    padding: '10px 8px',
    borderBottom: '2px solid #dadce0',
    color: '#5f6368',
    fontWeight: '500',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #f1f3f4',
    color: '#3c4043',
  },
  tdNum: {
    padding: '10px 8px',
    borderBottom: '1px solid #f1f3f4',
    color: '#3c4043',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  tdAcciones: {
    padding: '10px 8px',
    borderBottom: '1px solid #f1f3f4',
    whiteSpace: 'nowrap',
    textAlign: 'right',
  },
  tdTotal: {
    padding: '10px 8px',
    fontWeight: '500',
    color: '#3c4043',
  },
  margenNegativo: {
    color: '#d93025',
  },
  faltaReceta: {
    color: '#b06000',
    fontWeight: '500',
    fontSize: '14px',
  },
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
  secondaryButton: {
    padding: '8px 14px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#1a73e8',
    border: '1px solid #1a73e8',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  linkButton: {
    padding: '4px 8px',
    fontSize: '13px',
    backgroundColor: 'transparent',
    color: '#1a73e8',
    border: 'none',
    cursor: 'pointer',
  },
  dangerLink: {
    padding: '4px 8px',
    fontSize: '13px',
    backgroundColor: 'transparent',
    color: '#d93025',
    border: 'none',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  logoutButton: {
    padding: '8px 14px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#d93025',
    border: '1px solid #d93025',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default Receta;
