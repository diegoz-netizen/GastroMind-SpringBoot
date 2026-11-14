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

const soles = (monto) => `S/ ${Number(monto).toFixed(2).replace('.', ',')}`;

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

  const { auth } = useAuth();
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

  // Vista previa del costo con lo que está en pantalla; el oficial es el que calcula la API al guardar (HU-08)
  const costoLinea = (l) => {
    const insumo = insumoDe(l.ingrediente);
    return insumo && Number(l.cantidad_requerida) > 0 ? Number(l.cantidad_requerida) * Number(insumo.costo_unitario) : 0;
  };
  const costoEstimado = lineas.reduce((total, l) => total + costoLinea(l), 0);
  const porcentajeEstimado = platillo && Number(platillo.precio) > 0 ? Math.round((costoEstimado / Number(platillo.precio)) * 100) : null;

  // Un insumo no se repite en la misma receta: en cada línea solo salen los que no usan las demás
  const insumosDisponibles = (indice) =>
    insumos
      .filter((i) => !lineas.some((l, j) => j !== indice && String(l.ingrediente) === String(i.id)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const editable = esAdmin && platillo?.requiere_receta;

  return (
    <div className="pagina">
      <div className="cabecera">
        <div>
          <h1>Receta{platillo ? ` · ${platillo.nombre}` : ''}</h1>
          <p>Cantidades por porción. El costo se recalcula al guardar.</p>
        </div>
        <button type="button" className="boton" onClick={() => navigate('/carta')}>Volver a la carta</button>
      </div>

      {error && <div className="aviso error">{error}</div>}
      {exito && <div className="aviso ok">{exito}</div>}

      {loading ? (
        <p className="vacio">Cargando receta...</p>
      ) : (
        platillo && (
          <>
            <div className="kpis">
              <div className="kpi">
                <span>Precio · {platillo.categoria_nombre}</span>
                <b>{soles(platillo.precio)}</b>
                <small>{platillo.estado === 'ACTIVO' ? 'En la carta' : 'Fuera de la carta'}</small>
              </div>
              {/* Review 2: el costo y el margen solo los ve el admin (la API ni los manda a los demás roles) */}
              {esAdmin && platillo.costo != null && (
                <>
                  <div className="kpi">
                    <span>Costo guardado</span>
                    <b>{soles(platillo.costo)}</b>
                    <small>{platillo.porcentaje_costo != null ? `${platillo.porcentaje_costo} % del precio` : '—'}</small>
                  </div>
                  <div className="kpi oscuro">
                    <span>Margen</span>
                    <b className={Number(platillo.margen) < 0 ? 'texto-rojo' : undefined}>{soles(platillo.margen)}</b>
                    <small>por cada porción vendida</small>
                  </div>
                </>
              )}
            </div>

            {!platillo.requiere_receta ? (
              <div className="aviso info">
                Este platillo no lleva receta (no descuenta insumos). Si debería llevarla, márcalo como «Lleva receta» en la carta.
              </div>
            ) : insumos.length === 0 ? (
              <div className="aviso info">Tu restaurante no tiene insumos todavía; primero hay que registrarlos.</div>
            ) : (
              <form className="tarjeta receta" onSubmit={guardar} noValidate>
                <div className="titulo-tarjeta">
                  <h2>Insumos de la receta</h2>
                </div>
                {lineas.length === 0 ? (
                  <p className="texto-ambar fuerte">
                    {editable ? 'El platillo todavía no tiene receta. Agrega sus insumos.' : 'El platillo todavía no tiene receta.'}
                  </p>
                ) : (
                  <div className="tabla-caja">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th>Insumo</th>
                          <th className="num">Cantidad</th>
                          {esAdmin && <th className="num">Costo unitario</th>}
                          {esAdmin && <th className="num">Subtotal</th>}
                          {editable && <th></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.map((linea, indice) => {
                          const insumo = insumoDe(linea.ingrediente);
                          return (
                            <tr key={indice}>
                              <td>
                                {editable ? (
                                  <select className="entrada" value={linea.ingrediente}
                                    onChange={(e) => cambiarLinea(indice, 'ingrediente', e.target.value)}>
                                    <option value="">Elegir insumo</option>
                                    {insumosDisponibles(indice).map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                                  </select>
                                ) : (
                                  insumo?.nombre
                                )}
                                {erroresLinea[indice] && <span className="error-campo bloque">{erroresLinea[indice]}</span>}
                              </td>
                              <td className="num">
                                {editable ? (
                                  <>
                                    <input className="entrada-mini" type="number" step="0.001" min="0.001" placeholder="0,000"
                                      value={linea.cantidad_requerida}
                                      onChange={(e) => cambiarLinea(indice, 'cantidad_requerida', e.target.value)} />
                                    {' '}{insumo?.unidad_medida ?? ''}
                                  </>
                                ) : (
                                  `${cantidad(linea.cantidad_requerida)} ${insumo?.unidad_medida ?? ''}`
                                )}
                              </td>
                              {esAdmin && <td className="num">{insumo ? soles(insumo.costo_unitario) : '—'}</td>}
                              {esAdmin && <td className="num">{insumo ? cifra(costoLinea(linea)) : '—'}</td>}
                              {editable && (
                                <td className="acciones">
                                  <button type="button" className="enlace peligro" onClick={() => quitarLinea(indice)}>Quitar</button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {editable && (
                  <div className="fila-acciones">
                    <button type="button" className="boton" onClick={agregarLinea} disabled={lineas.length >= insumos.length}>
                      Agregar insumo
                    </button>
                    <span className="ayuda">Un insumo que ya está en la receta no se puede agregar dos veces.</span>
                  </div>
                )}

                {esAdmin && (
                  <div className="costo-porcion">
                    <span>Costo por porción</span>
                    <b>{soles(costoEstimado)}{porcentajeEstimado != null && <small> · {porcentajeEstimado} %</small>}</b>
                  </div>
                )}

                {editable && (
                  <div className="fila-acciones">
                    <button type="submit" className="boton primario ancho" disabled={guardando}>
                      {guardando ? 'Guardando...' : 'Guardar receta'}
                    </button>
                    <button type="button" className="enlace" onClick={descartarCambios}>Descartar cambios</button>
                  </div>
                )}
              </form>
            )}
          </>
        )
      )}
    </div>
  );
}

// "0.220" → "0,220" y "8.36" → "8,36", como el prototipo
const cantidad = (valor) => Number(valor).toFixed(3).replace('.', ',');
const cifra = (valor) => Number(valor).toFixed(2).replace('.', ',');

export default Receta;
