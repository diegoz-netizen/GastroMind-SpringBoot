import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AlertasDeHoy from '../components/AlertasDeHoy';
import { ROLES_CON_ALERTAS } from '../config/alertas';
import {
  CATALOGO, conToken, descargarExcel, enPorcentaje, enSoles, enSolesEnteros, fechaCorta, mensajeError, nombreMotivo, periodo,
} from '../config/reportes';

const PERIODOS = [
  { dias: 0, texto: 'Este mes' },
  { dias: 7, texto: '7 días' },
  { dias: 30, texto: '30 días' },
  { dias: 60, texto: '60 días' },
];

// Eje redondo por encima del valor más alto: 5 234 → 6 000
const topeDelEje = (maximo) => {
  if (!maximo) return 1;
  const escala = 10 ** Math.floor(Math.log10(maximo));
  return Math.ceil(maximo / escala) * escala;
};

// Una sola escala: ventas y costo son soles, así se comparan de verdad
function BarrasPorSemana({ semanas }) {
  const [activa, setActiva] = useState(null);
  const tope = topeDelEje(Math.max(...semanas.flatMap((s) => [s.ventas, s.costo])));
  return (
    <>
      <div className="leyenda">
        <span><i style={{ background: '#2f8a63' }} />Ventas</span>
        <span><i style={{ background: '#c98a1e' }} />Costo de insumos</span>
      </div>
      <div className="grafico">
        {[1, 0.5, 0].map((f) => (
          <div key={f}>
            <div className="linea" style={{ top: `${(1 - f) * 100}%` }} />
            <div className="eje" style={{ top: `${(1 - f) * 100}%` }}>{`${(tope * f) / 1000}k`}</div>
          </div>
        ))}
        {semanas.map((s) => (
          <div key={s.numero} className="grupo" onMouseEnter={() => setActiva(s.numero)} onMouseLeave={() => setActiva(null)}>
            <div className="marca" style={{ height: `${(s.ventas / tope) * 100}%`, background: '#2f8a63' }} />
            <div className="marca" style={{ height: `${(s.costo / tope) * 100}%`, background: '#c98a1e' }} />
            {activa === s.numero && (
              <div className="globo">
                Desde el {s.etiqueta}<br />Ventas {enSoles(s.ventas)}<br />Costo {enSoles(s.costo)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="etiquetas">{semanas.map((s) => <span key={s.numero}>{s.etiqueta}</span>)}</div>
      <details>
        <summary className="enlace">Ver como tabla</summary>
        <div className="tabla-caja">
          <table className="tabla">
            <thead><tr><th>Desde</th><th className="num">Ventas</th><th className="num">Costo</th></tr></thead>
            <tbody>
              {semanas.map((s) => (
                <tr key={s.numero}><td>{s.etiqueta}</td><td className="num">{enSoles(s.ventas)}</td><td className="num">{enSoles(s.costo)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

// HU-23: ventas, costo, merma y margen bruto del periodo
function PanelGerente({ token }) {
  const [dias, setDias] = useState(0);
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    const pedido = { ...conToken(token), params: periodo(dias) };
    // El panel de Django no trae los motivos: salen del reporte de merma (HU-19) del mismo periodo
    Promise.all([
      axios.get(`${CATALOGO}/reportes/panel/`, pedido),
      axios.get(`${CATALOGO}/reportes/merma/`, pedido),
    ])
      .then(([p, m]) => {
        if (!vigente) return;
        setPanel({
          ...p.data,
          variacion_ventas: p.data.anterior?.variacion_ventas ?? null,
          semanas: p.data.semanas.map((s, i) => ({
            numero: i + 1, etiqueta: fechaCorta(s.desde), ventas: Number(s.ventas), costo: Number(s.costo),
          })),
          platillos: p.data.platillos.map((pl) => ({ ...pl, porcentaje: pl.porcentaje_costo })),
          motivos: m.data.motivos,
        });
        setError('');
      })
      .catch((err) => { if (vigente) setError(mensajeError(err, 'No se pudo cargar el panel.')); });
    return () => { vigente = false; };
  }, [token, dias]);

  const exportar = () => descargarExcel(token, { tipo: 'merma', ...periodo(dias) })
    .catch((err) => setError(mensajeError(err, 'No se pudo exportar.')));

  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>Panel</h1>
          <p>{panel ? `Del ${fechaCorta(panel.desde)} al ${fechaCorta(panel.hasta)} · ventas, costo de insumos y merma` : 'Cargando...'}</p>
        </div>
        <div className="fila-acciones">
          <div className="selector" role="group" aria-label="Periodo">
            {PERIODOS.map((p) => (
              <button key={p.dias} className={p.dias === dias ? 'activo' : ''} aria-pressed={p.dias === dias} onClick={() => setDias(p.dias)}>
                {p.texto}
              </button>
            ))}
          </div>
          <button className="boton" onClick={exportar}>Exportar</button>
        </div>
      </header>

      {error && <div className="aviso error">{error}</div>}

      {panel && (
        <>
          <section className="kpis">
            <div className="kpi">
              <span>Ventas</span>
              <b>{enSolesEnteros(panel.ventas)}</b>
              <small>{panel.variacion_ventas === null ? 'Sin periodo anterior' : `${panel.variacion_ventas > 0 ? '+' : ''}${panel.variacion_ventas} % frente al periodo anterior`}</small>
            </div>
            <div className="kpi">
              <span>Costo de insumos</span>
              <b>{enSolesEnteros(panel.costo_insumos)}</b>
              <small>{panel.costo_porcentaje} % de las ventas</small>
            </div>
            <div className="kpi">
              <span>Merma</span>
              <b>{enSolesEnteros(panel.merma)}</b>
              <small>{panel.merma_porcentaje} % de las ventas</small>
            </div>
            <div className="kpi">
              <span>Margen bruto</span>
              <b>{enSolesEnteros(panel.margen)}</b>
              <small>{panel.margen_porcentaje} % de las ventas</small>
            </div>
          </section>

          <div className="dos-columnas">
            <section className="tarjeta">
              <h2>Ventas y costo por semana</h2>
              {panel.semanas.length > 0 ? <BarrasPorSemana semanas={panel.semanas} /> : <p className="vacio">Sin datos en este periodo.</p>}
            </section>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <AlertasDeHoy token={token} />
              <Link className="enlace" to="/compras">Ver sugerencia de compra</Link>
            </div>
          </div>

          <div className="dos-columnas">
            <section className="tarjeta">
              <div className="titulo-tarjeta">
                <h2>Platillos más vendidos</h2>
                <Link className="enlace" to="/carta">Ver la carta</Link>
              </div>
              <div className="tabla-caja">
                <table className="tabla">
                  <thead><tr><th>Platillo</th><th className="num">Vendidos</th><th className="num">Precio</th><th className="num">Costo</th><th className="num">% costo</th></tr></thead>
                  <tbody>
                    {panel.platillos.map((p) => (
                      <tr key={p.id}>
                        <td>{p.nombre}</td><td className="num">{p.vendidos}</td><td className="num">{enSoles(p.precio)}</td>
                        <td className="num">{enSoles(p.costo)}</td><td className="num">{enPorcentaje(p.porcentaje)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="tarjeta">
              <div className="titulo-tarjeta">
                <h2>Merma por motivo</h2>
                <Link className="enlace" to="/reportes">Ver el reporte</Link>
              </div>
              {panel.motivos.length === 0 && <p className="vacio">Sin mermas en este periodo.</p>}
              {panel.motivos.map((m) => (
                <div key={m.motivo}>
                  <div style={{ fontSize: 13.5, marginBottom: 4 }}>{nombreMotivo(m.motivo)}</div>
                  <div className="barra-h">
                    <div className="pista"><div className="relleno" style={{ width: `${m.porcentaje}%` }} /></div>
                    <span className="valor">{m.porcentaje} %</span>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

// Qué hace cada rol en la app; en la web solo consulta
const EN_LA_APP = {
  MOZO: 'Los pedidos se toman en la app GastroMind con tu PIN: eliges la mesa, agregas los platillos y cierras la cuenta.',
  COCINERO: 'Las comandas llegan solas a la app de cocina: ahí las pasas a Preparando y Listo, o las anulas con su motivo.',
  ALMACENERO: 'Los ingresos de compra, las mermas y los conteos se registran en la app con tu PIN.',
};

const ACCESOS = [
  { ruta: '/carta', titulo: 'Carta y recetas', texto: 'Los platillos de la sede, su precio y qué insumos lleva cada uno.' },
  { ruta: '/insumos', titulo: 'Insumos y kardex', texto: 'El stock de hoy, el mínimo de cada insumo y lo que vence pronto.' },
];

function InicioPersonal({ auth, rol }) {
  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>Hola, {auth.nombreCompleto}</h1>
          <p>{auth.correo} · {auth.rol}</p>
        </div>
      </header>

      {EN_LA_APP[rol] && <div className="aviso info" role="note">{EN_LA_APP[rol]}</div>}

      <section className="accesos">
        {ACCESOS.map((a) => (
          <Link key={a.ruta} to={a.ruta} className="tarjeta acceso">
            <h2>{a.titulo}</h2>
            <p className="ayuda">{a.texto}</p>
            <span className="enlace">Abrir</span>
          </Link>
        ))}
      </section>

      {ROLES_CON_ALERTAS.includes(rol) && <AlertasDeHoy token={auth.token} />}
    </div>
  );
}

function Dashboard() {
  const { auth } = useAuth();
  const rol = auth.rol?.toUpperCase();
  if (rol === 'ADMINISTRADOR') return <PanelGerente token={auth.token} />;
  return <InicioPersonal auth={auth} rol={rol} />;
}

export default Dashboard;
