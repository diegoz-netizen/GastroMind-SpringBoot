import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CATALOGO, cantidadDe, conToken, enSoles, fechaCorta, mensajeError, unidadDe } from '../config/reportes';

const dias = (n) => `${n} ${n === 1 ? 'día' : 'días'}`;

// HU-21 sugerencia de compra y HU-22 proveedores
function Compras() {
  const { auth } = useAuth();
  const [sugerencia, setSugerencia] = useState(null);
  const [ajustes, setAjustes] = useState({});
  const [proveedores, setProveedores] = useState([]);
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('20');
  const [comparacion, setComparacion] = useState(null);
  const [nuevo, setNuevo] = useState({ nombre: '', contacto: '' });
  const [precio, setPrecio] = useState({ proveedor: '', precio: '', flete: '', dias: '' });
  const [aviso, setAviso] = useState(null);

  const cargarProveedores = useCallback(() => axios.get(`${CATALOGO}/proveedores/`, conToken(auth.token))
    .then((r) => setProveedores(r.data)), [auth.token]);

  useEffect(() => {
    axios.get(`${CATALOGO}/reportes/sugerencia/`, conToken(auth.token))
      .then((r) => {
        setSugerencia(r.data);
        setInsumoId((actual) => actual || String(r.data.filas[0]?.id ?? ''));
      })
      .catch((err) => setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudo calcular la sugerencia.') }));
    cargarProveedores().catch(() => {});
  }, [auth.token, cargarProveedores]);

  const comparar = useCallback(() => {
    if (!insumoId) return;
    axios.get(`${CATALOGO}/reportes/proveedores/`, { ...conToken(auth.token), params: { insumo: insumoId, cantidad: cantidad || 1 } })
      .then((r) => setComparacion(r.data))
      .catch((err) => setAviso({ tipo: 'error', texto: mensajeError(err) }));
  }, [auth.token, insumoId, cantidad]);

  useEffect(() => { comparar(); }, [comparar]);

  const aComprar = (fila) => ajustes[fila.id] ?? fila.comprar;

  const copiarLista = async () => {
    const lineas = sugerencia.filas.filter((f) => Number(aComprar(f)) > 0)
      .map((f) => `${f.insumo}: ${aComprar(f)} ${unidadDe(f.unidad)}${f.proveedor ? ` · ${f.proveedor.proveedor}` : ''}`);
    try {
      await navigator.clipboard.writeText(lineas.join('\n'));
      setAviso({ tipo: 'ok', texto: `Lista copiada: ${lineas.length} insumos.` });
    } catch {
      setAviso({ tipo: 'error', texto: 'El navegador no dejó copiar la lista.' });
    }
  };

  const crearProveedor = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${CATALOGO}/proveedores/`, nuevo, conToken(auth.token));
      setNuevo({ nombre: '', contacto: '' });
      setAviso({ tipo: 'ok', texto: 'Proveedor registrado. Ahora agrega sus precios.' });
      cargarProveedores();
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err) });
    }
  };

  const guardarPrecio = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${CATALOGO}/proveedores/${precio.proveedor}/precios/`,
        {
          insumo_id: insumoId, precio_unitario: precio.precio, flete: precio.flete || 0, tiempo_entrega_dias: precio.dias,
        }, conToken(auth.token));
      setPrecio({ proveedor: '', precio: '', flete: '', dias: '' });
      setAviso({ tipo: 'ok', texto: 'Precio guardado.' });
      comparar();
      cargarProveedores();
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err) });
    }
  };

  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>Compras y proveedores</h1>
          <p>Qué comprar esta semana y a quién conviene</p>
        </div>
      </header>

      {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

      <section className="tarjeta">
        <div className="titulo-tarjeta">
          <h2>Sugerencia de compra</h2>
          <button className="boton" onClick={copiarLista} disabled={!sugerencia}>Copiar como lista</button>
        </div>
        {sugerencia && (
          <p className="ayuda">
            Para los próximos {sugerencia.dias} días, con {sugerencia.semanas} semanas de consumo ({fechaCorta(sugerencia.desde)} al {fechaCorta(sugerencia.hasta)}) y más peso en las 2 más recientes.
            Comprar = consumo previsto + mínimo − stock, redondeado. Cada cantidad se puede cambiar antes de copiar.
          </p>
        )}
        <div className="tabla-caja">
          <table className="tabla">
            <thead><tr><th>Insumo</th><th className="num">Stock</th><th className="num">Previsto</th><th className="num">Mínimo</th><th className="num">Comprar</th><th>Proveedor sugerido</th></tr></thead>
            <tbody>
              {sugerencia?.filas.map((f) => (
                <tr key={f.id}>
                  <td>{f.insumo}</td>
                  <td className="num">{cantidadDe(f.stock)} {unidadDe(f.unidad)}</td>
                  <td className="num">{cantidadDe(f.previsto)} {unidadDe(f.unidad)}</td>
                  <td className="num">{cantidadDe(f.minimo)} {unidadDe(f.unidad)}</td>
                  <td className="num">
                    <input className="entrada-mini" type="number" min="0" aria-label={`Cantidad de ${f.insumo}`} value={aComprar(f)}
                      onChange={(e) => setAjustes((a) => ({ ...a, [f.id]: e.target.value }))} /> {unidadDe(f.unidad)}
                  </td>
                  <td>{Number(aComprar(f)) > 0 ? (f.proveedor?.proveedor ?? 'Sin proveedor') : 'No hace falta'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta">
        <h2>Comparar proveedores</h2>
        <div className="filtros">
          <label className="campo">Insumo
            <select value={insumoId} onChange={(e) => setInsumoId(e.target.value)}>
              {sugerencia?.filas.map((f) => <option key={f.id} value={f.id}>{f.insumo}</option>)}
            </select>
          </label>
          <label className="campo">Cantidad{comparacion ? ` (${unidadDe(comparacion.unidad)})` : ''}
            <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </label>
        </div>
        {comparacion?.opciones.length === 0 && <p className="vacio">Nadie vende este insumo todavía. Agrega un precio abajo.</p>}
        <div className="opciones">
          {comparacion?.opciones.map((o, i) => (
            <div key={o.proveedor_id} className={o.sugerido ? 'opcion mejor' : 'opcion'}>
              <div className="titulo-tarjeta">
                <strong>{o.proveedor}</strong>
                {o.sugerido && <span className="chip verde">Menor costo</span>}
              </div>
              <span>{enSoles(o.precio_unitario)} /{unidadDe(comparacion.unidad)} · flete {enSoles(o.flete)} · entrega en {dias(o.tiempo_entrega_dias)}</span>
              <b>{enSoles(o.costo_total)}</b>
            </div>
          ))}
        </div>
        <form className="filtros" onSubmit={guardarPrecio}>
          <label className="campo">Proveedor
            <select required value={precio.proveedor} onChange={(e) => setPrecio({ ...precio, proveedor: e.target.value })}>
              <option value="">Elige</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label className="campo">Precio (S/)<input required type="number" step="0.01" min="0.01" value={precio.precio} onChange={(e) => setPrecio({ ...precio, precio: e.target.value })} /></label>
          <label className="campo">Flete (S/)<input type="number" step="0.01" min="0" value={precio.flete} onChange={(e) => setPrecio({ ...precio, flete: e.target.value })} /></label>
          <label className="campo">Días de entrega<input required type="number" min="0" value={precio.dias} onChange={(e) => setPrecio({ ...precio, dias: e.target.value })} /></label>
          <button className="boton" type="submit">Guardar precio</button>
        </form>
      </section>

      <section className="tarjeta">
        <h2>Proveedores</h2>
        <div className="tabla-caja">
          <table className="tabla">
            <thead><tr><th>Nombre</th><th>Contacto</th><th className="num">Insumos con precio</th></tr></thead>
            <tbody>
              {proveedores.map((p) => (
                <tr key={p.id}><td>{p.nombre}</td><td>{p.contacto ?? '—'}</td><td className="num">{p.precios.length}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="filtros" onSubmit={crearProveedor}>
          <label className="campo">Nombre<input required maxLength={150} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} /></label>
          <label className="campo">Contacto<input maxLength={150} value={nuevo.contacto} onChange={(e) => setNuevo({ ...nuevo, contacto: e.target.value })} /></label>
          <button className="boton primario" type="submit">Nuevo proveedor</button>
        </form>
      </section>
    </div>
  );
}

export default Compras;
