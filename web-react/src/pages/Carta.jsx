import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DJANGO_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

// La carta va en Django (catálogo); el token es el mismo que entrega el login de Spring
const API_PRODUCTOS = `${DJANGO_URL}/api/catalogo/productos/`;
const API_CATEGORIAS = `${DJANGO_URL}/api/catalogo/categorias/`;

const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const FORM_VACIO = { nombre: '', precio: '', categoria: '', requiere_receta: true };

const soles = (precio) => `S/ ${Number(precio).toFixed(2)}`;

// HU-07: el gerente crea, edita y desactiva platillos con su precio (CA-07)
function Carta() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [soloActivos, setSoloActivos] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erroresCampo, setErroresCampo] = useState({});
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
    if (status === 403) return 'Solo un administrador puede modificar la carta.';
    if (status === 404) return 'El platillo no existe en tu restaurante.';
    return data?.mensaje || 'Ocurrió un error al procesar la solicitud.';
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        const [respProductos, respCategorias] = await Promise.all([
          axios.get(API_PRODUCTOS, conToken(auth.token)),
          axios.get(API_CATEGORIAS, conToken(auth.token)),
        ]);
        setProductos(respProductos.data);
        setCategorias(respCategorias.data);
      } catch (err) {
        setError(mensajeDeError(err));
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [auth.token]);

  // Reemplaza el platillo en la lista con lo que devolvió la API
  const actualizarEnLista = (platillo) =>
    setProductos((lista) => lista.map((p) => (p.id === platillo.id ? platillo : p)));

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setErroresCampo((errores) => ({ ...errores, [name]: undefined }));
  };

  const limpiarMensajes = () => {
    setError('');
    setExito('');
    setErroresCampo({});
  };

  const editar = (platillo) => {
    limpiarMensajes();
    setEditandoId(platillo.id);
    setForm({
      nombre: platillo.nombre,
      precio: platillo.precio,
      categoria: platillo.categoria,
      requiere_receta: platillo.requiere_receta,
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErroresCampo({});
  };

  const guardar = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    setGuardando(true);

    try {
      if (editandoId) {
        const response = await axios.patch(`${API_PRODUCTOS}${editandoId}/`, form, conToken(auth.token));
        actualizarEnLista(response.data);
        setExito(`Platillo "${response.data.nombre}" actualizado.`);
      } else {
        const response = await axios.post(API_PRODUCTOS, form, conToken(auth.token));
        setProductos((lista) => [...lista, response.data]);
        setExito(`Platillo "${response.data.nombre}" agregado a la carta.`);
      }
      setEditandoId(null);
      setForm(FORM_VACIO);
    } catch (err) {
      // 400: Django devuelve {error: 'VALIDACION', mensaje, campos: {campo: mensaje}} (HL-014)
      if (err.response?.data?.error === 'VALIDACION') {
        const campos = err.response.data.campos || {};
        setErroresCampo(campos);
        if (Object.keys(campos).length === 0) setError(err.response.data.mensaje);
      } else {
        setError(mensajeDeError(err));
      }
    } finally {
      setGuardando(false);
    }
  };

  // CA-07: desactivar no borra; el platillo sale de la toma de pedidos y queda en el historial
  const cambiarEstado = async (platillo) => {
    const nuevoEstado = platillo.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    if (
      nuevoEstado === 'INACTIVO' &&
      !window.confirm(
        `¿Desactivar "${platillo.nombre}"? Dejará de aparecer en la toma de pedidos, pero se conserva en el historial de ventas.`
      )
    ) {
      return;
    }
    limpiarMensajes();
    try {
      const response = await axios.patch(
        `${API_PRODUCTOS}${platillo.id}/estado/`,
        { estado: nuevoEstado },
        conToken(auth.token)
      );
      actualizarEnLista(response.data);
      setExito(
        nuevoEstado === 'INACTIVO'
          ? `"${platillo.nombre}" desactivado: ya no sale en la toma de pedidos.`
          : `"${platillo.nombre}" activado: vuelve a la carta.`
      );
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  const cerrarSesion = () => {
    logout();
    navigate('/');
  };

  const errorDe = (campo) =>
    erroresCampo[campo] && <span style={styles.fieldError}>{erroresCampo[campo]}</span>;

  // Mismo orden que la API: por categoría y nombre
  const visibles = productos
    .filter((p) => !soloActivos || p.estado === 'ACTIVO')
    .sort(
      (a, b) =>
        a.categoria_nombre.localeCompare(b.categoria_nombre, 'es') || a.nombre.localeCompare(b.nombre, 'es')
    );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Carta</h1>
            <p style={styles.subtitle}>
              {auth.nombreCompleto} · {auth.rol}
            </p>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => navigate('/dashboard')} style={styles.secondaryButton}>
              Volver
            </button>
            <button onClick={cerrarSesion} style={styles.logoutButton}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {exito && <p style={styles.success}>{exito}</p>}

        {esAdmin && !loading && (
          <form onSubmit={guardar} style={styles.form} noValidate>
            <h2 style={styles.formTitle}>{editandoId ? 'Editar platillo' : 'Agregar platillo'}</h2>
            {categorias.length === 0 ? (
              <p style={styles.detail}>Tu restaurante no tiene categorías todavía; primero hay que crear una.</p>
            ) : (
              <>
                <div style={styles.grid}>
                  <label style={styles.label}>
                    Nombre *
                    <input name="nombre" value={form.nombre} onChange={cambiar} style={styles.input} maxLength={150} />
                    {errorDe('nombre')}
                  </label>
                  <label style={styles.label}>
                    Precio (S/) *
                    <input name="precio" type="number" step="0.01" min="0.01" value={form.precio}
                      onChange={cambiar} style={styles.input} />
                    {errorDe('precio')}
                  </label>
                  <label style={styles.label}>
                    Categoría *
                    <select name="categoria" value={form.categoria} onChange={cambiar} style={styles.input}>
                      <option value="">Elige una categoría</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    {errorDe('categoria')}
                  </label>
                  <label style={styles.checkLabel}>
                    <input name="requiere_receta" type="checkbox" checked={form.requiere_receta} onChange={cambiar} />
                    Lleva receta (descuenta insumos)
                  </label>
                </div>
                <div style={styles.formButtons}>
                  <button type="submit" disabled={guardando}
                    style={{ ...styles.primaryButton, ...(guardando ? styles.buttonDisabled : {}) }}>
                    {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Agregar'}
                  </button>
                  {editandoId && (
                    <button type="button" onClick={cancelarEdicion} style={styles.secondaryButton}>
                      Cancelar
                    </button>
                  )}
                </div>
              </>
            )}
          </form>
        )}

        <label style={styles.filtro}>
          <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} />
          Solo platillos activos (los que salen en la toma de pedidos)
        </label>

        {loading ? (
          <p style={styles.detail}>Cargando carta...</p>
        ) : visibles.length === 0 && !error ? (
          <p style={styles.detail}>No hay platillos para mostrar.</p>
        ) : (
          visibles.length > 0 && (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Categoría</th>
                  <th style={styles.th}>Platillo</th>
                  <th style={styles.thNum}>Precio</th>
                  <th style={styles.thNum}>Costo</th>
                  <th style={styles.thNum}>Margen</th>
                  <th style={styles.th}>Receta</th>
                  <th style={styles.th}>Estado</th>
                  {esAdmin && <th style={styles.th}></th>}
                </tr>
              </thead>
              <tbody>
                {visibles.map((platillo) => {
                  const activo = platillo.estado === 'ACTIVO';
                  // HU-08: sin su receta, el costo no está completo (saldría 0)
                  const faltaReceta = platillo.requiere_receta && platillo.detalles_receta.length === 0;
                  return (
                    <tr key={platillo.id} style={activo ? undefined : styles.filaInactiva}>
                      <td style={styles.td}>{platillo.categoria_nombre}</td>
                      <td style={styles.td}>{platillo.nombre}</td>
                      <td style={styles.tdNum}>{soles(platillo.precio)}</td>
                      <td style={styles.tdNum}>{faltaReceta ? '—' : soles(platillo.costo)}</td>
                      <td style={{ ...styles.tdNum, ...(Number(platillo.margen) < 0 ? styles.margenNegativo : {}) }}>
                        {faltaReceta ? (
                          '—'
                        ) : (
                          <>
                            {soles(platillo.margen)}
                            <span style={styles.porcentaje}>{platillo.porcentaje_costo} % en insumos</span>
                          </>
                        )}
                      </td>
                      <td style={styles.td}>
                        {!platillo.requiere_receta ? (
                          'No lleva'
                        ) : faltaReceta ? (
                          <span style={styles.faltaReceta}>Falta la receta</span>
                        ) : (
                          `${platillo.detalles_receta.length} insumo(s)`
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={activo ? styles.badgeActivo : styles.badgeInactivo}>
                          {activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {esAdmin && (
                        <td style={styles.tdAcciones}>
                          <button onClick={() => editar(platillo)} style={styles.linkButton}>
                            Editar
                          </button>
                          <button onClick={() => cambiarEstado(platillo)}
                            style={activo ? styles.dangerLink : styles.linkButton}>
                            {activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
  form: {
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #dadce0',
  },
  formTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    color: '#3c4043',
  },
  formButtons: {
    display: 'flex',
    gap: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '14px',
    marginBottom: '16px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '13px',
    color: '#5f6368',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#5f6368',
  },
  filtro: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#3c4043',
  },
  input: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
  },
  fieldError: {
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
  porcentaje: {
    display: 'block',
    fontSize: '12px',
    color: '#5f6368',
  },
  margenNegativo: {
    color: '#d93025',
  },
  faltaReceta: {
    color: '#b06000',
    fontWeight: '500',
  },
  filaInactiva: {
    opacity: 0.6,
  },
  badgeActivo: {
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    fontSize: '12px',
  },
  badgeInactivo: {
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#f1f3f4',
    color: '#5f6368',
    fontSize: '12px',
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

export default Carta;
