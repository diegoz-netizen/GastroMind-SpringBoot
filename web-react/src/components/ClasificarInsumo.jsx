import { useState } from 'react';
import axios from 'axios';
import { CATALOGO, conToken, mensajeError } from '../config/reportes';

// HU-25: RECETA se descuenta al servir; LIBRE se controla por dotación y conteo
function ClasificarInsumo({ insumo, token, onGuardado }) {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({ tipo: 'RECETA', cantidad: '', periodo: 'SEMANAL' });
  const [error, setError] = useState('');

  const abrir = () => {
    setForm({
      tipo: insumo.tipo_control,
      cantidad: insumo.dotacion_cantidad ?? '',
      periodo: insumo.dotacion_periodo ?? 'SEMANAL',
    });
    setError('');
    setAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const libre = form.tipo === 'LIBRE';
    try {
      // Django (HU-25): PATCH a /clasificacion/; la dotación solo va si es LIBRE
      const datos = libre
        ? { tipo_control: form.tipo, dotacion_cantidad: form.cantidad, dotacion_periodo: form.periodo }
        : { tipo_control: form.tipo };
      const r = await axios.patch(`${CATALOGO}/insumos/${insumo.id}/clasificacion/`, datos, conToken(token));
      onGuardado(r.data);
      setAbierto(false);
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <>
      <button type="button" className="enlace" style={{ marginLeft: 8 }} onClick={abrir}>Cambiar</button>
      {abierto && (
        <div className="modal-fondo">
          <form className="modal" onSubmit={guardar}>
            <h2>Clasificar {insumo.nombre}</h2>
            <label className="campo">Control
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="RECETA">RECETA: se descuenta al servir</option>
                <option value="LIBRE">LIBRE: por dotación y conteo</option>
              </select>
            </label>
            {form.tipo === 'LIBRE' && (
              <>
                <label className="campo">Cantidad de dotación ({insumo.unidad_medida})
                  <input type="number" step="0.001" min="0.001" required value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
                </label>
                <label className="campo">Periodo
                  <select value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })}>
                    <option value="SEMANAL">Semanal</option>
                    <option value="MENSUAL">Mensual</option>
                  </select>
                </label>
              </>
            )}
            {error && <div className="aviso error">{error}</div>}
            <div className="fila-acciones">
              <button className="boton primario" type="submit">Guardar</button>
              <button className="boton" type="button" onClick={() => setAbierto(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default ClasificarInsumo;
