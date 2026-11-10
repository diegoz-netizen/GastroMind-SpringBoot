import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  CATALOGO, cantidadDe, conSigno, conToken, descargarExcel, enSoles, fechaCorta, mensajeError, periodoDelMes,
} from '../config/reportes';

const META_MERMA = 2;
// Escala de las barras: 10 % = barra llena
const ESCALA_BARRA = 10;

// HU-19 % de merma, HU-20 teórico contra real, HU-24 exportar con los mismos filtros
function Reportes() {
  const { auth } = useAuth();
  const [filtros, setFiltros] = useState({ ...periodoDelMes(), insumo: '' });
  const [insumos, setInsumos] = useState([]);
  const [merma, setMerma] = useState(null);
  const [consumo, setConsumo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${CATALOGO}/insumos/`, conToken(auth.token)).then((r) => setInsumos(r.data)).catch(() => {});
  }, [auth.token]);

  const cargar = useCallback(async () => {
    const params = { desde: filtros.desde, hasta: filtros.hasta, ...(filtros.insumo ? { insumo: filtros.insumo } : {}) };
    try {
      const [m, c] = await Promise.all([
        axios.get(`${CATALOGO}/reportes/merma/`, { ...conToken(auth.token), params }),
        axios.get(`${CATALOGO}/reportes/consumo/`, { ...conToken(auth.token), params }),
      ]);
      setMerma(m.data);
      setConsumo(c.data);
      setError('');
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron cargar los reportes.'));
    }
  }, [auth.token, filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (e) => setFiltros((f) => ({ ...f, [e.target.name]: e.target.value }));
  const exportar = (tipo) => descargarExcel(auth.token, {
    tipo, desde: filtros.desde, hasta: filtros.hasta, ...(filtros.insumo ? { insumo: filtros.insumo } : {}),
  }).catch((err) => setError(mensajeError(err, 'No se pudo exportar.')));

  const filasConsumo = consumo?.filas.filter((f) => !filtros.insumo || String(f.id) === filtros.insumo) ?? [];

  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>Mermas y consumo</h1>
          <p>Del {fechaCorta(filtros.desde)} al {fechaCorta(filtros.hasta)}</p>
        </div>
        <div className="fila-acciones">
          <button className="boton" onClick={() => exportar('merma')}>Excel de merma</button>
          <button className="boton" onClick={() => exportar('consumo')}>Excel de consumo</button>
          <button className="boton" onClick={() => exportar('inventario')}>Excel de inventario</button>
        </div>
      </header>

      <div className="filtros">
        <label className="campo">Desde<input type="date" name="desde" value={filtros.desde} max={filtros.hasta} onChange={cambiar} /></label>
        <label className="campo">Hasta<input type="date" name="hasta" value={filtros.hasta} min={filtros.desde} onChange={cambiar} /></label>
        <label className="campo">Insumo
          <select name="insumo" value={filtros.insumo} onChange={cambiar}>
            <option value="">Todos</option>
            {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="aviso error">{error}</div>}

      <div className="mitades">
        <section className="tarjeta">
          <div className="titulo-tarjeta">
            <h2>Merma sobre el consumo</h2>
            {merma && <span className={Number(merma.total.porcentaje) > META_MERMA ? 'chip ambar' : 'chip verde'}>{merma.total.porcentaje} % · meta {META_MERMA} %</span>}
          </div>
          <p className="ayuda">Merma ÷ consumo total del insumo. {merma && `Perdido en el periodo: ${enSoles(merma.total.costo_merma)}.`} La barra llena equivale a {ESCALA_BARRA} %.</p>
          <div className="tabla-caja">
            <table className="tabla">
              <thead><tr><th>Insumo</th><th className="num">Consumo</th><th className="num">Merma</th><th style={{ minWidth: 140 }}>%</th></tr></thead>
              <tbody>
                {merma?.filas.map((f) => (
                  <tr key={f.id}>
                    <td>{f.insumo}</td>
                    <td className="num">{cantidadDe(f.consumo)} {f.unidad}</td>
                    <td className="num">{cantidadDe(f.merma)} {f.unidad}</td>
                    <td>
                      <div className="barra-h">
                        <div className="pista">
                          <div className={f.porcentaje > 5 ? 'relleno alto' : 'relleno'} style={{ width: `${Math.min(100, (f.porcentaje / ESCALA_BARRA) * 100)}%` }} />
                        </div>
                        <span className="valor">{f.porcentaje} %</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {merma?.filas.length === 0 && <p className="vacio">Sin movimientos en este periodo.</p>}
        </section>

        <section className="tarjeta">
          <h2>Consumo teórico contra real</h2>
          <p className="ayuda">Teórico = recetas × platillos servidos. Real = lo que salió del inventario, más lo que faltó en el último conteo físico. Se resaltan las diferencias mayores a {consumo?.umbral ?? 5} %.</p>
          <div className="tabla-caja">
            <table className="tabla">
              <thead><tr><th>Insumo</th><th className="num">Teórico</th><th className="num">Real</th><th className="num">Diferencia</th></tr></thead>
              <tbody>
                {filasConsumo.map((f) => (
                  <tr key={f.id} className={f.resaltar ? 'resaltada' : ''}>
                    <td>{f.insumo}</td>
                    <td className="num">{cantidadDe(f.teorico)} {f.unidad}</td>
                    <td className="num">{cantidadDe(f.real)} {f.unidad}</td>
                    <td className="num">{conSigno(f.diferencia)} {f.unidad} · {conSigno(f.porcentaje)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filasConsumo.length === 0 && <p className="vacio">Sin platillos servidos en este periodo.</p>}
        </section>
      </div>
    </div>
  );
}

export default Reportes;
