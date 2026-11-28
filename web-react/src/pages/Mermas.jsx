import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CATALOGO_WEB_URL } from '../config/api';
import { API_SPRING, cantidadDe, conToken, enSoles, mensajeError, nombreMotivo, unidadDe } from '../config/reportes';
import { Icono } from '../components/Marca';

// HU-17 en la web de Operación (rediseño v2): registrar lo que se perdió en el turno.
// El análisis (% de merma por motivo e insumo) está en el panel de Catálogo (Django).
const ICONOS = {
  VENCIDO: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  QUEMADO: 'M12 22c4 0 7-3 7-7 0-5-5-8-5-12-3 2-7 6-7 11a6 6 0 0 0 5 8z',
  DERRAMADO: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  MAL_MANEJO: 'M12 3 2 20h20L12 3zM12 10v4M12 17h.01',
};

function Mermas() {
  const { auth } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [form, setForm] = useState({ ingredienteId: '', cantidad: '', motivoId: '' });
  const [registradas, setRegistradas] = useState([]);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_SPRING}/compras/opciones`, conToken(auth.token)),
      axios.get(`${API_SPRING}/mermas/motivos`, conToken(auth.token)),
    ]).then(([o, m]) => { setInsumos(o.data.insumos); setMotivos(m.data); })
      .catch((err) => setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudieron cargar los insumos.') }));
  }, [auth.token]);

  const insumo = insumos.find((i) => String(i.id) === form.ingredienteId);

  const registrar = async (e) => {
    e.preventDefault();
    if (!form.motivoId) { setAviso({ tipo: 'error', texto: 'Elige el motivo de la merma.' }); return; }
    setGuardando(true);
    try {
      const r = await axios.post(`${API_SPRING}/mermas`, {
        ingredienteId: Number(form.ingredienteId), cantidad: form.cantidad, motivoId: Number(form.motivoId),
      }, conToken(auth.token));
      setRegistradas((lista) => [r.data, ...lista]);
      setInsumos((lista) => lista.map((i) => (String(i.id) === form.ingredienteId ? { ...i, stockActual: r.data.stockDespues } : i)));
      setAviso({ tipo: 'ok', texto: `Merma registrada: ${cantidadDe(r.data.cantidad)} ${unidadDe(r.data.unidadMedida)} de ${r.data.insumo} (${enSoles(r.data.costo)}).` });
      setForm({ ingredienteId: '', cantidad: '', motivoId: '' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudo registrar la merma.') });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>Mermas del turno</h1>
          <p>Lo que se botó, se quemó o venció: baja el stock y queda en el kardex con su motivo.</p>
        </div>
        <a className="boton" href={CATALOGO_WEB_URL} target="_blank" rel="noreferrer">
          <Icono d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> Ver el análisis en Catálogo
        </a>
      </header>

      {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

      <div className="dos-columnas">
        <form className="tarjeta" onSubmit={registrar}>
          <h2>Registrar una merma</h2>
          <span className="campo-etiqueta">¿Por qué se perdió?</span>
          <div className="motivos">
            {motivos.map((m) => (
              <button key={m.id} type="button" className={String(m.id) === form.motivoId ? 'motivo activo' : 'motivo'}
                onClick={() => setForm((f) => ({ ...f, motivoId: String(m.id) }))}>
                <Icono d={ICONOS[m.nombre] ?? ICONOS.MAL_MANEJO} tamano={22} />
                {nombreMotivo(m.nombre)}
              </button>
            ))}
          </div>
          <div className="rejilla-campos">
            <label className="campo">Insumo *
              <select required value={form.ingredienteId} onChange={(e) => setForm((f) => ({ ...f, ingredienteId: e.target.value }))}>
                <option value="">Elige</option>
                {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </label>
            <label className="campo">Cantidad *{insumo ? ` (${unidadDe(insumo.unidadMedida)})` : ''}
              <input type="number" step="0.001" min="0.001" required value={form.cantidad} onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))} />
            </label>
          </div>
          {insumo && <p className="ayuda">Stock actual de {insumo.nombre}: <b className="mono">{cantidadDe(insumo.stockActual)} {unidadDe(insumo.unidadMedida)}</b></p>}
          <button className="boton primario" type="submit" disabled={guardando}>{guardando ? 'Registrando…' : 'Registrar merma'}</button>
        </form>

        <section className="tarjeta">
          <h2>Registradas en este turno</h2>
          {registradas.length === 0 && <p className="vacio">Lo que registres aparece aquí con su costo.</p>}
          <ul className="lista-compras">
            {registradas.map((m) => (
              <li key={m.id}>
                <span className="icono-redondo rojo"><Icono d={ICONOS[m.motivo] ?? ICONOS.MAL_MANEJO} /></span>
                <div>
                  <b>{m.insumo} · {cantidadDe(m.cantidad)} {unidadDe(m.unidadMedida)}</b>
                  <small>{nombreMotivo(m.motivo)} · queda {cantidadDe(m.stockDespues)} {unidadDe(m.unidadMedida)} · {m.registradoPor}</small>
                </div>
                <span className="mono texto-rojo">−{enSoles(m.costo)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default Mermas;
