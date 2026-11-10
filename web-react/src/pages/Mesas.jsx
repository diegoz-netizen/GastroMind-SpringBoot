import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_SPRING, conToken, mensajeError } from '../config/reportes';

const VACIO = { numero: '', capacidad: '4', zona: 'Salón' };

// HU-26: las mesas que el mozo elige al tomar el pedido
function Mesas() {
  const { auth } = useAuth();
  const [mesas, setMesas] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [aviso, setAviso] = useState(null);
  const [editando, setEditando] = useState(null);

  const cargar = useCallback(() => axios.get(`${API_SPRING}/mesas`, conToken(auth.token))
    .then((r) => setMesas(r.data))
    .catch((err) => setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudieron cargar las mesas.') })), [auth.token]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const editar = (m) => {
    setEditando(m);
    setForm({ numero: String(m.numero), capacidad: String(m.capacidad), zona: m.zona });
    setAviso(null);
  };

  const cancelar = () => {
    setEditando(null);
    setForm(VACIO);
  };

  // HU-26: el mismo formulario registra (POST) o edita (PUT) una mesa
  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await axios.put(`${API_SPRING}/mesas/${editando.id}`, form, conToken(auth.token));
        setAviso({ tipo: 'ok', texto: `Mesa ${form.numero} actualizada.` });
      } else {
        await axios.post(`${API_SPRING}/mesas`, form, conToken(auth.token));
        setAviso({ tipo: 'ok', texto: `Mesa ${form.numero} registrada.` });
      }
      cancelar();
      cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err) });
    }
  };

  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>Mesas del salón</h1>
          <p>{mesas.length} mesas · el mozo elige una de estas al tomar el pedido</p>
        </div>
      </header>

      {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

      <section className="tarjeta">
        <h2>{editando ? `Editar la mesa ${editando.numero}` : 'Agregar mesa'}</h2>
        <form className="filtros" onSubmit={guardar}>
          <label className="campo">Número<input required type="number" min="1" name="numero" value={form.numero} onChange={cambiar} /></label>
          <label className="campo">Capacidad<input required type="number" min="1" max="30" name="capacidad" value={form.capacidad} onChange={cambiar} /></label>
          <label className="campo">Zona<input required maxLength={30} name="zona" value={form.zona} onChange={cambiar} /></label>
          <button className="boton primario" type="submit">{editando ? 'Guardar cambios' : 'Agregar mesa'}</button>
          {editando && <button className="boton" type="button" onClick={cancelar}>Cancelar</button>}
        </form>
      </section>

      <section className="mesas">
        {mesas.map((m) => (
          <div key={m.id} className={`mesa ${m.estado}`}>
            <b>M{m.numero}</b>
            <small>{m.zona} · {m.capacidad} personas</small>
            <span><span className={m.estado === 'LIBRE' ? 'chip verde' : 'chip ambar'}>{m.estado === 'LIBRE' ? 'Libre' : 'Ocupada'}</span></span>
            <button type="button" className="enlace" onClick={() => editar(m)}>Editar</button>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Mesas;
