import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AlertasDeHoy from '../components/AlertasDeHoy';
import { ROLES_CON_ALERTAS } from '../config/alertas';
import { CATALOGO_WEB_URL } from '../config/api';
import { API_SPRING, cantidadDe, conToken, enSoles, mensajeError, unidadDe } from '../config/reportes';
import { Icono } from '../components/Marca';
import { Resumen } from '../components/Visual';

// Rediseño v2 (Operación): el panel de Spring responde "¿qué pasa hoy en mi local?".
// El análisis de ventas, costos y mermas está en el panel de Catálogo (Django).
const ESTADO_PLATILLO = {
  PENDIENTE: ['Pendiente', 'gris'],
  EN_PREPARACION: ['Preparando', 'ambar'],
  LISTO: ['Listo', 'verde'],
  SERVIDO: ['Servido', 'gris'],
  ANULADO: ['Anulado', 'rojo'],
};
// Spring guarda la hora en UTC sin zona
const minutosDesde = (fecha, ahora) => Math.max(0, Math.round((ahora - Date.parse(`${fecha}Z`)) / 60000));
const tiempo = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`);
const hora = (fecha) => new Date(`${fecha}Z`).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

function Dashboard() {
  const { auth } = useAuth();
  const [mesas, setMesas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [error, setError] = useState('');
  const [ahora, setAhora] = useState(() => Date.now());
  const verAlertas = ROLES_CON_ALERTAS.includes(auth.rol?.toUpperCase());

  const cargar = useCallback(async () => {
    try {
      const [m, p, c] = await Promise.all([
        axios.get(`${API_SPRING}/mesas`, conToken(auth.token)),
        axios.get(`${API_SPRING}/pedidos`, conToken(auth.token)),
        axios.get(`${API_SPRING}/compras`, conToken(auth.token)).catch(() => ({ data: [] })),
      ]);
      setMesas(m.data);
      setPedidos(p.data);
      setCompras(c.data);
      setAhora(Date.now());
      setError('');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar el estado del local.'));
    }
  }, [auth.token]);

  // Se actualiza solo cada 30 segundos, como la cocina
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 30000);
    return () => clearInterval(id);
  }, [cargar]);

  const ocupadas = mesas.filter((m) => m.estado !== 'LIBRE').length;
  const platillos = pedidos.flatMap((p) => p.detalles);
  const listos = platillos.filter((d) => d.estado === 'LISTO').length;
  const enCocina = platillos.filter((d) => d.estado === 'PENDIENTE' || d.estado === 'EN_PREPARACION').length;
  const demorados = pedidos.filter((p) => minutosDesde(p.fechaRegistro, ahora) >= 25
    && p.detalles.some((d) => d.estado === 'PENDIENTE' || d.estado === 'EN_PREPARACION')).length;
  const pedidoDeMesa = Object.fromEntries(pedidos.map((p) => [p.mesaNumero, p]));

  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>Hoy en el local</h1>
          <p>{new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })} · se actualiza cada 30 segundos</p>
        </div>
        <a className="boton" href={CATALOGO_WEB_URL} target="_blank" rel="noreferrer">
          <Icono d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> Ver ventas y costos en Catálogo
        </a>
      </header>

      {error && <div className="aviso error">{error}</div>}

      <section className="resumenes">
        <Resumen etiqueta="Mesas ocupadas" valor={`${ocupadas} de ${mesas.length}`} detalle={`${mesas.length - ocupadas} libres`} tono="ambar" />
        <Resumen etiqueta="Platillos en cocina" valor={enCocina} detalle={`${pedidos.length} pedidos abiertos`} tono="azul" />
        <Resumen etiqueta="Listos para servir" valor={listos} detalle={listos ? 'El mozo debe llevarlos' : 'Nada esperando'} tono={listos ? 'verde' : 'verde'} />
        <Resumen etiqueta="Pedidos demorados" valor={demorados} detalle="Más de 25 minutos en cocina" tono={demorados ? 'rojo' : 'verde'} />
      </section>

      <div className="dos-columnas">
        <div className="columna">
          <section className="tarjeta">
            <div className="titulo-tarjeta">
              <h2>El salón ahora</h2>
              <span className="leyenda-barras"><span><i className="muestra libre" />Libre</span><span><i className="muestra ocupada" />Ocupada</span></span>
            </div>
            <div className="mini-plano">
              {mesas.map((m) => {
                const p = pedidoDeMesa[m.numero];
                const ocupada = m.estado !== 'LIBRE';
                return (
                  <div key={m.id} className={ocupada ? 'mini-mesa ocupada' : 'mini-mesa'} title={`Mesa ${m.numero} · ${m.zona} · ${m.capacidad} personas`}>
                    <b>M{m.numero}</b>
                    <small>{ocupada && p ? tiempo(minutosDesde(p.fechaRegistro, ahora)) : `${m.capacidad} pers.`}</small>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="tarjeta">
            <h2>Pedidos en curso</h2>
            {pedidos.length === 0 && <p className="vacio">No hay pedidos abiertos.</p>}
            <div className="pedidos-hoy">
              {pedidos.map((p) => {
                const vigentes = p.detalles.filter((d) => d.estado !== 'ANULADO');
                const hechos = vigentes.filter((d) => d.estado === 'LISTO' || d.estado === 'SERVIDO').length;
                const min = minutosDesde(p.fechaRegistro, ahora);
                return (
                  <article key={p.id} className={min >= 25 && hechos < vigentes.length ? 'pedido-hoy demorado' : 'pedido-hoy'}>
                    <header>
                      <span className="insignia-mesa">M{p.mesaNumero}</span>
                      <div>
                        <b>Mesa {p.mesaNumero}</b>
                        <small>Pedido #{p.id} · {hora(p.fechaRegistro)} · {tiempo(min)}</small>
                      </div>
                    </header>
                    <ul>
                      {p.detalles.map((d) => {
                        const [texto, tono] = ESTADO_PLATILLO[d.estado] ?? [d.estado, 'gris'];
                        return <li key={d.id}><span>{d.cantidad}× {d.producto}</span><span className={`chip ${tono}`}>{texto}</span></li>;
                      })}
                    </ul>
                    <div className="pista"><div className="relleno" style={{ width: `${vigentes.length ? (hechos / vigentes.length) * 100 : 0}%` }} /></div>
                    <small className="ayuda">{hechos} de {vigentes.length} listos</small>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="columna">
          {verAlertas && <AlertasDeHoy token={auth.token} />}
          <section className="tarjeta">
            <h2>Últimas compras recibidas</h2>
            {compras.length === 0 && <p className="vacio">Todavía no hay compras registradas.</p>}
            <ul className="lista-compras">
              {compras.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <span className="icono-redondo verde"><Icono d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /></span>
                  <div>
                    <b>{c.insumo} · {cantidadDe(c.cantidad)} {unidadDe(c.unidadMedida)}</b>
                    <small>{c.proveedor} · {new Date(c.fechaRegistro).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</small>
                  </div>
                  <span className="mono">{enSoles(c.costoTotal)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
