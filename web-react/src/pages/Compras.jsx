import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CATALOGO_WEB_URL } from '../config/api';
import { API_SPRING, cantidadDe, conToken, enSoles, mensajeError, unidadDe } from '../config/reportes';
import { Icono } from '../components/Marca';
import { Inicial } from '../components/Visual';

// HU-14 en la web de Operación (rediseño v2): registrar lo que llegó del proveedor.
// Qué comprar, a quién y a qué precio se decide en el panel de Catálogo (Django).
const VACIO = { proveedorId: '', ingredienteId: '', cantidad: '', costoTotal: '', lote: '', fechaVencimiento: '' };

function Compras() {
  const { auth } = useAuth();
  const [opciones, setOpciones] = useState({ proveedores: [], insumos: [] });
  const [compras, setCompras] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([
        axios.get(`${API_SPRING}/compras/opciones`, conToken(auth.token)),
        axios.get(`${API_SPRING}/compras`, conToken(auth.token)),
      ]);
      setOpciones(o.data);
      setCompras(c.data);
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudieron cargar las compras.') });
    }
  }, [auth.token]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const insumo = opciones.insumos.find((i) => String(i.id) === form.ingredienteId);
  const despues = insumo && Number(form.cantidad) > 0 ? Number(insumo.stockActual) + Number(form.cantidad) : null;

  const registrar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const cuerpo = {
        proveedorId: Number(form.proveedorId),
        ingredienteId: Number(form.ingredienteId),
        cantidad: form.cantidad,
        costoTotal: form.costoTotal,
        lote: form.lote || null,
        fechaVencimiento: form.fechaVencimiento || null,
      };
      const r = await axios.post(`${API_SPRING}/compras`, cuerpo, conToken(auth.token));
      setAviso({ tipo: 'ok', texto: `Compra registrada: ${cantidadDe(r.data.cantidad)} ${unidadDe(r.data.unidadMedida)} de ${r.data.insumo}. Stock actual: ${cantidadDe(r.data.stockResultante)} ${unidadDe(r.data.unidadMedida)}.` });
      setForm(VACIO);
      cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudo registrar la compra.') });
    } finally {
      setGuardando(false);
    }
  };

  const totalMes = compras.filter((c) => new Date(c.fechaRegistro).getMonth() === new Date().getMonth())
    .reduce((s, c) => s + Number(c.costoTotal), 0);

  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>Compras recibidas</h1>
          <p>Registra lo que llegó del proveedor: el stock sube y queda en el kardex. Este mes van {enSoles(totalMes)} en compras.</p>
        </div>
        <a className="boton" href={CATALOGO_WEB_URL} target="_blank" rel="noreferrer">
          <Icono d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /> ¿Qué comprar? Ver la lista en Catálogo
        </a>
      </header>

      {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

      <div className="dos-columnas">
        <form className="tarjeta" onSubmit={registrar}>
          <h2>Registrar una compra</h2>
          <div className="rejilla-campos">
            <label className="campo">Proveedor *
              <select name="proveedorId" required value={form.proveedorId} onChange={cambiar}>
                <option value="">Elige</option>
                {opciones.proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
            <label className="campo">Insumo *
              <select name="ingredienteId" required value={form.ingredienteId} onChange={cambiar}>
                <option value="">Elige</option>
                {opciones.insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </label>
            <label className="campo">Cantidad recibida *{insumo ? ` (${unidadDe(insumo.unidadMedida)})` : ''}
              <input name="cantidad" type="number" step="0.001" min="0.001" required value={form.cantidad} onChange={cambiar} />
            </label>
            <label className="campo">Costo total (S/) *
              <input name="costoTotal" type="number" step="0.01" min="0" required value={form.costoTotal} onChange={cambiar} />
            </label>
            <label className="campo">Lote
              <input name="lote" maxLength={50} value={form.lote} onChange={cambiar} />
            </label>
            <label className="campo">Vence el
              <input name="fechaVencimiento" type="date" value={form.fechaVencimiento} onChange={cambiar} />
            </label>
          </div>
          {insumo && (
            <div className="antes-despues">
              <span>Stock ahora <b className="mono">{cantidadDe(insumo.stockActual)} {unidadDe(insumo.unidadMedida)}</b></span>
              <Icono d="M5 12h14M13 6l6 6-6 6" />
              <span>Después <b className="mono texto-verde">{despues === null ? '—' : `${cantidadDe(despues)} ${unidadDe(insumo.unidadMedida)}`}</b></span>
            </div>
          )}
          <button className="boton primario" type="submit" disabled={guardando}>{guardando ? 'Registrando…' : 'Registrar compra'}</button>
        </form>

        <section className="tarjeta">
          <h2>Últimas compras</h2>
          {compras.length === 0 && <p className="vacio">Todavía no hay compras registradas.</p>}
          <ul className="lista-compras">
            {compras.slice(0, 12).map((c) => (
              <li key={c.id}>
                <Inicial texto={c.insumo} tamano={36} />
                <div>
                  <b>{c.insumo} · {cantidadDe(c.cantidad)} {unidadDe(c.unidadMedida)}</b>
                  <small>{c.proveedor}{c.lote ? ` · lote ${c.lote}` : ''}{c.fechaVencimiento ? ` · vence ${c.fechaVencimiento.split('-').reverse().join('/')}` : ''}</small>
                  <small>{new Date(c.fechaRegistro).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {c.registradoPor}</small>
                </div>
                <span className="mono">{enSoles(c.costoTotal)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default Compras;
