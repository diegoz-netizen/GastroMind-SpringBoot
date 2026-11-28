import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CATALOGO, cantidadDe, conToken, enSoles, enSolesEnteros, fechaCorta, mensajeError, unidadDe } from '../config/reportes';
import { Inicial, Resumen } from '../components/Visual';

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

  // Rediseño v2: la sugerencia como lista de compras agrupada por proveedor, con su subtotal
  const costoDe = (f) => (f.proveedor ? Number(f.proveedor.precio_unitario) * Number(aComprar(f) || 0) + Number(f.proveedor.flete) : 0);
  const porComprar = sugerencia?.filas.filter((f) => Number(aComprar(f)) > 0) ?? [];
  const alDia = sugerencia?.filas.filter((f) => !(Number(aComprar(f)) > 0)) ?? [];
  const grupos = Object.values(porComprar.reduce((acc, f) => {
    const clave = f.proveedor?.proveedor ?? 'Sin proveedor';
    acc[clave] = acc[clave] ?? { proveedor: clave, dias: f.proveedor?.tiempo_entrega_dias, filas: [] };
    acc[clave].filas.push(f);
    return acc;
  }, {})).sort((x, y) => y.filas.length - x.filas.length);
  const total = porComprar.reduce((suma, f) => suma + costoDe(f), 0);
  const peor = comparacion?.opciones.reduce((m, o) => Math.max(m, Number(o.costo_total)), 0) || 1;

  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>Compras y proveedores</h1>
          <p>Qué comprar esta semana, a quién y cuánto cuesta</p>
        </div>
        <button className="boton primario" onClick={copiarLista} disabled={!sugerencia}>Copiar lista de compras</button>
      </header>

      {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

      <section className="resumenes">
        <Resumen etiqueta="Insumos por comprar" valor={porComprar.length} detalle={`${alDia.length} ya alcanzan`} tono={porComprar.length ? 'ambar' : 'verde'} />
        <Resumen etiqueta="Costo estimado" valor={enSolesEnteros(total)} detalle="Con el proveedor de menor costo" tono="verde" />
        <Resumen etiqueta="Proveedores en la lista" valor={grupos.length} detalle={`${proveedores.length} registrados`} tono="azul" />
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">
          <h2>Lista de compras por proveedor</h2>
          {sugerencia && <span className="chip gris">Próximos {sugerencia.dias} días</span>}
        </div>
        {sugerencia && (
          <p className="ayuda">
            Calculada con {sugerencia.semanas} semanas de consumo ({fechaCorta(sugerencia.desde)} al {fechaCorta(sugerencia.hasta)}): consumo previsto + mínimo − stock.
            Puedes cambiar cada cantidad antes de copiar la lista.
          </p>
        )}
        <div className="grupos-compra">
          {grupos.map((g) => (
            <article key={g.proveedor} className="grupo-compra">
              <header>
                <Inicial texto={g.proveedor} tamano={38} />
                <div>
                  <h3>{g.proveedor}</h3>
                  <small>{g.dias != null ? `Entrega en ${dias(g.dias)}` : 'Agrega su precio abajo'} · {g.filas.length} insumos</small>
                </div>
                <b className="mono">{enSoles(g.filas.reduce((suma, f) => suma + costoDe(f), 0))}</b>
              </header>
              <ul>
                {g.filas.map((f) => (
                  <li key={f.id}>
                    <div className="compra-insumo">
                      <b>{f.insumo}</b>
                      <small>Stock {cantidadDe(f.stock)} · mín. {cantidadDe(f.minimo)} · previsto {cantidadDe(f.previsto)} {unidadDe(f.unidad)}</small>
                    </div>
                    <label className="compra-cantidad">
                      <input className="entrada-mini" type="number" min="0" aria-label={`Cantidad de ${f.insumo}`} value={aComprar(f)}
                        onChange={(e) => setAjustes((a) => ({ ...a, [f.id]: e.target.value }))} /> {unidadDe(f.unidad)}
                    </label>
                    <span className="mono compra-costo">{f.proveedor ? enSoles(costoDe(f)) : '—'}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {sugerencia && grupos.length === 0 && <p className="vacio">No hace falta comprar nada esta semana.</p>}
        </div>
        {alDia.length > 0 && (
          <details className="al-dia">
            <summary>Ya alcanzan ({alDia.length})</summary>
            <div className="chips-filtro">{alDia.map((f) => <span key={f.id} className="chip verde">{f.insumo}</span>)}</div>
          </details>
        )}
      </section>

      <section className="tarjeta">
        <h2>¿A quién le compro?</h2>
        <p className="ayuda">Elige un insumo y la cantidad: los proveedores se ordenan por el costo total, con el flete incluido.</p>
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
        <div className="ranking">
          {comparacion?.opciones.map((o, i) => (
            <div key={o.proveedor_id} className={o.sugerido ? 'ranking-fila mejor' : 'ranking-fila'}>
              <span className="ranking-puesto">{i + 1}</span>
              <Inicial texto={o.proveedor} tamano={34} />
              <div className="ranking-datos">
                <b>{o.proveedor} {o.sugerido && <span className="chip verde">Menor costo</span>}</b>
                <small>{enSoles(o.precio_unitario)} /{unidadDe(comparacion.unidad)} · flete {enSoles(o.flete)} · entrega en {dias(o.tiempo_entrega_dias)}</small>
                <div className="pista"><div className="relleno" style={{ width: `${(Number(o.costo_total) / peor) * 100}%` }} /></div>
              </div>
              <b className="mono ranking-total">{enSoles(o.costo_total)}</b>
            </div>
          ))}
        </div>
        <details className="formulario-plegable">
          <summary>Agregar o cambiar un precio</summary>
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
        </details>
      </section>

      <section className="tarjeta">
        <h2>Proveedores</h2>
        <div className="rejilla-proveedores">
          {proveedores.map((p) => (
            <article key={p.id} className="proveedor-tarjeta">
              <header>
                <Inicial texto={p.nombre} tamano={42} />
                <div>
                  <h3>{p.nombre}</h3>
                  <small>{p.contacto ?? 'Sin contacto'}</small>
                </div>
              </header>
              <div className="chips-filtro">
                {p.precios.slice(0, 6).map((x) => <span key={x.id} className="chip gris">{x.insumo} · {enSoles(x.precio_unitario)}</span>)}
                {p.precios.length > 6 && <span className="chip gris">+{p.precios.length - 6} más</span>}
                {p.precios.length === 0 && <span className="chip ambar">Sin precios</span>}
              </div>
            </article>
          ))}
          <form className="proveedor-tarjeta nuevo" onSubmit={crearProveedor}>
            <h3>Nuevo proveedor</h3>
            <label className="campo">Nombre<input required maxLength={150} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} /></label>
            <label className="campo">Contacto<input maxLength={150} value={nuevo.contacto} onChange={(e) => setNuevo({ ...nuevo, contacto: e.target.value })} /></label>
            <button className="boton primario" type="submit">Registrar proveedor</button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Compras;
