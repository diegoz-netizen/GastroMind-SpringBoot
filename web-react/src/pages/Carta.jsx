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

const soles = (precio) => `S/ ${Number(precio).toFixed(2).replace('.', ',')}`;

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
  const [formAbierto, setFormAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);

  const { auth } = useAuth();
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
      setFormAbierto(false);
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

  const errorDe = (campo) => erroresCampo[campo] && <span className="error-campo">{erroresCampo[campo]}</span>;

  const abrirNuevo = () => {
    limpiarMensajes();
    setEditandoId(null);
    setForm(FORM_VACIO);
    setFormAbierto(true);
  };

  // Mismo orden que la API: por categoría y nombre; luego la búsqueda, la categoría y "solo activos"
  const texto = busqueda.trim().toLowerCase();
  const ordenados = [...productos].sort(
    (a, b) => a.categoria_nombre.localeCompare(b.categoria_nombre, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
  const visibles = ordenados.filter((p) =>
    (!soloActivos || p.estado === 'ACTIVO')
    && (categoriaFiltro === null || p.categoria === categoriaFiltro)
    && p.nombre.toLowerCase().includes(texto));
  const cuantos = (idCategoria) => productos.filter((p) => p.categoria === idCategoria).length;

  // Lo que va debajo del nombre, como en el prototipo: "Fondos · 6 insumos"
  const detalle = (platillo) => {
    if (!platillo.requiere_receta) return `${platillo.categoria_nombre} · sin receta, no descuenta stock`;
    if (platillo.detalles_receta.length === 0) return `${platillo.categoria_nombre} · falta la receta`;
    return `${platillo.categoria_nombre} · ${platillo.detalles_receta.length} insumos`;
  };

  return (
    <div className="pagina">
      <div className="cabecera">
        <div>
          <h1>Carta</h1>
          <p>Precio, costo según la receta y margen de cada platillo</p>
        </div>
        {esAdmin && categorias.length > 0 && (
          <button type="button" className="boton primario" onClick={abrirNuevo}>Nuevo platillo</button>
        )}
      </div>

      {error && <div className="aviso error">{error}</div>}
      {exito && <div className="aviso ok">{exito}</div>}
      {esAdmin && !loading && categorias.length === 0 && (
        <div className="aviso info">Tu restaurante no tiene categorías todavía; primero hay que crear una.</div>
      )}

      <div className="barra-filtros">
        <input
          className="buscador"
          type="search"
          placeholder="Buscar platillo"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar platillo"
        />
        <div className="pastillas">
          <button type="button" className={categoriaFiltro === null ? 'pastilla activa' : 'pastilla'} onClick={() => setCategoriaFiltro(null)}>
            Todos · {productos.length}
          </button>
          {categorias.map((c) => (
            <button key={c.id} type="button" className={categoriaFiltro === c.id ? 'pastilla activa' : 'pastilla'} onClick={() => setCategoriaFiltro(c.id)}>
              {c.nombre} · {cuantos(c.id)}
            </button>
          ))}
          <label className="pastilla-check">
            <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} />
            Solo activos
          </label>
        </div>
      </div>

      {formAbierto && (
        <div className="modal-fondo">
          <form className="modal modal-ancho" onSubmit={guardar} noValidate>
            <h2>{editandoId ? 'Editar platillo' : 'Nuevo platillo'}</h2>
            <div className="rejilla-campos">
              <label className="campo">Nombre *
                <input name="nombre" value={form.nombre} onChange={cambiar} maxLength={150} />
                {errorDe('nombre')}
              </label>
              <label className="campo">Precio (S/) *
                <input name="precio" type="number" step="0.01" min="0.01" value={form.precio} onChange={cambiar} />
                {errorDe('precio')}
              </label>
              <label className="campo">Categoría *
                <select name="categoria" value={form.categoria} onChange={cambiar}>
                  <option value="">Elige una categoría</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                {errorDe('categoria')}
              </label>
            </div>
            <label className="campo-check">
              <input name="requiere_receta" type="checkbox" checked={form.requiere_receta} onChange={cambiar} />
              Lleva receta (descuenta insumos al servir)
            </label>
            <div className="fila-acciones">
              <button type="submit" className="boton primario" disabled={guardando}>
                {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Agregar a la carta'}
              </button>
              <button type="button" className="boton" onClick={() => { cancelarEdicion(); setFormAbierto(false); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="tarjeta sin-relleno">
        {loading ? (
          <p className="vacio con-margen">Cargando carta...</p>
        ) : visibles.length === 0 ? (
          !error && <p className="vacio con-margen">No hay platillos para mostrar.</p>
        ) : (
          <div className="tabla-caja">
            <table className="tabla tabla-panel">
              <thead>
                <tr>
                  <th>Platillo</th>
                  <th className="num">Precio</th>
                  {/* Review 2: costo y margen solo para el admin */}
                  {esAdmin && <th className="num">Costo</th>}
                  {esAdmin && <th className="num">% costo</th>}
                  {esAdmin && <th className="num">Margen</th>}
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((platillo) => {
                  const activo = platillo.estado === 'ACTIVO';
                  // HU-08: la API manda el costo en null si el platillo no lleva receta o aún no la tiene
                  const sinCosto = platillo.costo == null;
                  return (
                    <tr key={platillo.id} className={activo ? undefined : 'apagada'}>
                      <td>
                        {platillo.nombre}
                        <small className={platillo.requiere_receta && platillo.detalles_receta.length === 0 ? 'sub texto-ambar' : 'sub'}>
                          {detalle(platillo)}
                        </small>
                      </td>
                      <td className="num">{soles(platillo.precio)}</td>
                      {esAdmin && <td className="num">{sinCosto ? '—' : soles(platillo.costo)}</td>}
                      {esAdmin && <td className="num">{sinCosto || platillo.porcentaje_costo == null ? '—' : `${Math.round(platillo.porcentaje_costo)} %`}</td>}
                      {esAdmin && (
                        <td className={Number(platillo.margen) < 0 ? 'num texto-rojo' : 'num'}>{sinCosto ? '—' : soles(platillo.margen)}</td>
                      )}
                      <td>{activo ? 'Activo' : 'Inactivo'}</td>
                      <td className="acciones">
                        {/* HU-06: desde aquí se abre la receta del platillo (el admin la arma; el resto solo la ve) */}
                        {platillo.requiere_receta && (
                          <button type="button" className="enlace" onClick={() => navigate(`/carta/${platillo.id}/receta`)}>Receta</button>
                        )}
                        {esAdmin && (
                          <>
                            <button type="button" className="enlace" onClick={() => { editar(platillo); setFormAbierto(true); }}>Editar</button>
                            <button type="button" className={activo ? 'enlace peligro' : 'enlace'} onClick={() => cambiarEstado(platillo)}>
                              {activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Carta;
