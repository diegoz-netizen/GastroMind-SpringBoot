import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  CATALOGO, cantidadDe, conSigno, conToken, descargarExcel, enPorcentaje, enSoles, enSolesEnteros, fechaCorta, mensajeError, nombreMotivo, periodo,
  periodoDelMes, unidadDe } from '../config/reportes';
import { Inicial, Resumen } from '../components/Visual';

// Periodos rápidos (rediseño v2): 0 = el mes en curso
const PERIODOS = [[0, 'Este mes'], [7, 'Últimos 7 días'], [30, 'Últimos 30 días']];
const MOSTRAR = 8;

const META_MERMA = 2;

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

  // Rediseño v2: rankings en barras en vez de tablas; lo que más pesa, primero
  const [todosMerma, setTodosMerma] = useState(false);
  const [todosConsumo, setTodosConsumo] = useState(false);
  const elegirPeriodo = (dias) => setFiltros((f) => ({ ...f, ...periodo(dias) }));
  const filasMerma = [...(merma?.filas ?? [])].filter((f) => Number(f.merma) > 0).sort((x, y) => Number(y.costo_merma) - Number(x.costo_merma));
  const maxMerma = Math.max(...filasMerma.map((f) => Number(f.costo_merma)), 1);
  const motivos = [...(merma?.motivos ?? [])].sort((x, y) => Number(y.costo) - Number(x.costo));
  const consumoOrdenado = [...filasConsumo].sort((x, y) => Math.abs(Number(y.porcentaje)) - Math.abs(Number(x.porcentaje)));
  const aRevisar = filasConsumo.filter((f) => f.resaltar).length;
  const porcentajeMerma = Number(merma?.total.porcentaje ?? 0);

  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>Mermas y reportes</h1>
          <p>Del {fechaCorta(filtros.desde)} al {fechaCorta(filtros.hasta)}: cuánto se pierde, por qué y dónde no cuadra el consumo</p>
        </div>
        <div className="fila-acciones">
          <span className="ayuda">Descargar Excel:</span>
          <button className="boton" onClick={() => exportar('merma')}>Merma</button>
          <button className="boton" onClick={() => exportar('consumo')}>Consumo</button>
          <button className="boton" onClick={() => exportar('inventario')}>Inventario</button>
        </div>
      </header>

      <div className="barra-herramientas">
        <div className="chips-filtro">
          {PERIODOS.map(([d, texto]) => {
            const p = periodo(d);
            const activo = p.desde === filtros.desde && p.hasta === filtros.hasta;
            return <button key={d} type="button" className={activo ? 'chip-filtro activo' : 'chip-filtro'} onClick={() => elegirPeriodo(d)}>{texto}</button>;
          })}
        </div>
        <label className="campo en-linea">Desde<input type="date" name="desde" value={filtros.desde} max={filtros.hasta} onChange={cambiar} /></label>
        <label className="campo en-linea">Hasta<input type="date" name="hasta" value={filtros.hasta} min={filtros.desde} onChange={cambiar} /></label>
        <label className="campo en-linea">Insumo
          <select name="insumo" value={filtros.insumo} onChange={cambiar}>
            <option value="">Todos</option>
            {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="aviso error">{error}</div>}

      {merma && (
        <section className="resumenes">
          <Resumen etiqueta="Merma del periodo" valor={enPorcentaje(merma.total.porcentaje)} detalle={porcentajeMerma > META_MERMA ? `Sobre la meta de ${META_MERMA} %` : `Dentro de la meta de ${META_MERMA} %`} tono={porcentajeMerma > META_MERMA ? 'rojo' : 'verde'} />
          <Resumen etiqueta="Dinero perdido" valor={enSoles(merma.total.costo_merma)} detalle="Costo de lo que se botó" tono="ambar" />
          <Resumen etiqueta="Consumo de insumos" valor={enSolesEnteros(merma.total.costo_consumo)} detalle="Lo que salió del almacén" tono="azul" />
          <Resumen etiqueta="Insumos a revisar" valor={aRevisar} detalle={`Real y teórico difieren más de ${consumo?.umbral ?? 5} %`} tono={aRevisar ? 'rojo' : 'verde'} />
        </section>
      )}

      <div className="mitades">
        <section className="tarjeta">
          <h2>¿Por qué se pierde?</h2>
          <p className="ayuda">Del dinero perdido, cuánto fue por cada motivo.</p>
          <div className="ranking">
            {motivos.map((m) => (
              <div key={m.motivo} className="ranking-fila">
                <div className="ranking-datos">
                  <b>{nombreMotivo(m.motivo)}</b>
                  <div className="pista"><div className="relleno ambar" style={{ width: `${Math.min(100, Number(m.porcentaje))}%` }} /></div>
                </div>
                <b className="mono ranking-total">{enSoles(m.costo)}<small>{enPorcentaje(m.porcentaje)}</small></b>
              </div>
            ))}
            {merma && motivos.length === 0 && <p className="vacio">Sin mermas en este periodo.</p>}
          </div>
        </section>

        <section className="tarjeta">
          <h2>¿Qué se pierde más?</h2>
          <p className="ayuda">Insumos por dinero perdido. El % es la merma sobre su consumo (meta {META_MERMA} %).</p>
          <div className="ranking">
            {(todosMerma ? filasMerma : filasMerma.slice(0, MOSTRAR)).map((f, i) => (
              <div key={f.id} className="ranking-fila">
                <span className="ranking-puesto">{i + 1}</span>
                <Inicial texto={f.insumo} tamano={30} />
                <div className="ranking-datos">
                  <b>{f.insumo} <small>{cantidadDe(f.merma)} {unidadDe(f.unidad)} de {cantidadDe(f.consumo)}</small></b>
                  <div className="pista"><div className={f.porcentaje > 5 ? 'relleno alto' : 'relleno'} style={{ width: `${(Number(f.costo_merma) / maxMerma) * 100}%` }} /></div>
                </div>
                <b className="mono ranking-total">{enSoles(f.costo_merma)}<small className={Number(f.porcentaje) > META_MERMA ? 'texto-rojo' : ''}>{enPorcentaje(f.porcentaje)}</small></b>
              </div>
            ))}
            {merma && filasMerma.length === 0 && <p className="vacio">Sin mermas en este periodo.</p>}
          </div>
          {filasMerma.length > MOSTRAR && (
            <button type="button" className="enlace-boton" onClick={() => setTodosMerma((t) => !t)}>{todosMerma ? 'Ver menos' : `Ver los ${filasMerma.length}`}</button>
          )}
        </section>
      </div>

      <section className="tarjeta">
        <div className="titulo-tarjeta">
          <h2>Consumo teórico contra real</h2>
          <div className="leyenda-barras"><span><i className="muestra teorico" />Teórico (recetas)</span><span><i className="muestra real" />Real (inventario)</span></div>
        </div>
        <p className="ayuda">Teórico = recetas × platillos servidos. Real = lo que salió del inventario, más lo que faltó en el último conteo. Primero, las diferencias más grandes; en rojo, las mayores a {consumo?.umbral ?? 5} %.</p>
        <div className="comparativo">
          {(todosConsumo ? consumoOrdenado : consumoOrdenado.slice(0, MOSTRAR)).map((f) => {
            const tope = Math.max(Number(f.teorico), Number(f.real), 0.001);
            return (
              <div key={f.id} className={f.resaltar ? 'comparativo-fila resaltada' : 'comparativo-fila'}>
                <div className="comparativo-nombre"><Inicial texto={f.insumo} tamano={30} /><b>{f.insumo}</b></div>
                <div className="comparativo-barras">
                  <div className="pista"><div className="relleno gris" style={{ width: `${(Number(f.teorico) / tope) * 100}%` }} /><span>{cantidadDe(f.teorico)} {unidadDe(f.unidad)}</span></div>
                  <div className="pista"><div className={f.resaltar ? 'relleno alto' : 'relleno'} style={{ width: `${(Number(f.real) / tope) * 100}%` }} /><span>{cantidadDe(f.real)} {unidadDe(f.unidad)}</span></div>
                </div>
                <span className={f.resaltar ? 'chip rojo' : 'chip verde'}>{conSigno(f.diferencia)} {unidadDe(f.unidad)} · {conSigno(f.porcentaje)} %</span>
              </div>
            );
          })}
          {consumo && filasConsumo.length === 0 && <p className="vacio">Sin platillos servidos en este periodo.</p>}
        </div>
        {consumoOrdenado.length > MOSTRAR && (
          <button type="button" className="enlace-boton" onClick={() => setTodosConsumo((t) => !t)}>{todosConsumo ? 'Ver menos' : `Ver los ${consumoOrdenado.length}`}</button>
        )}
      </section>
    </div>
  );
}

export default Reportes;
