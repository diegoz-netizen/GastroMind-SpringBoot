import { useEffect, useState } from 'react';
import axios from 'axios';
import { CATALOGO, cantidadDe, conToken, enSoles, mensajeError, unidadDe } from '../config/reportes';
import { Linea } from './Visual';

// HU-15 en la web (rediseño v2): el kardex de un insumo en un panel lateral, con el saldo en un gráfico,
// lo que entró y salió en los últimos 30 días y sus últimos movimientos, en vez de una tabla larga
const TIPOS = {
  INGRESO: { texto: 'Compra', clase: 'verde', signo: '+' },
  CONSUMO: { texto: 'Consumo', clase: 'gris', signo: '−' },
  MERMA: { texto: 'Merma', clase: 'rojo', signo: '−' },
  AJUSTE: { texto: 'Ajuste', clase: 'azul', signo: '' },
};

const diaHora = (iso) => new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function KardexPanel({ insumo, token, onCerrar }) {
  const [kardex, setKardex] = useState(null);
  const [error, setError] = useState('');
  // Hora de apertura del panel: base de los últimos 30 días
  const [abierto] = useState(() => Date.now());

  useEffect(() => {
    axios.get(`${CATALOGO}/insumos/${insumo.id}/kardex/`, conToken(token))
      .then((r) => setKardex(r.data))
      .catch((err) => setError(mensajeError(err, 'No se pudo cargar el kardex.')));
  }, [insumo.id, token]);

  useEffect(() => {
    const alPulsar = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  const unidad = unidadDe(insumo.unidad_medida);
  const movimientos = kardex?.movimientos ?? [];
  const hace30 = abierto - 30 * 86400000;
  const recientes = movimientos.filter((m) => new Date(m.fecha).getTime() >= hace30);
  const suma = (tipo, campo) => recientes.filter((m) => m.tipo === tipo).reduce((s, m) => s + Number(m[campo] ?? 0), 0);
  const ultimos = [...movimientos].reverse().slice(0, 12);

  return (
    <div className="panel-fondo" onClick={onCerrar}>
      <aside className="panel-lateral" onClick={(e) => e.stopPropagation()} aria-label={`Kardex de ${insumo.nombre}`}>
        <header className="panel-cabeza">
          <div>
            <span className="kicker">Kardex</span>
            <h2>{insumo.nombre}</h2>
            <p>Stock actual <b className="mono">{cantidadDe(insumo.stock_actual)} {unidad}</b> · mínimo {cantidadDe(insumo.stock_minimo)} {unidad}</p>
          </div>
          <button type="button" className="boton" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>

        {error && <div className="aviso error">{error}</div>}
        {!kardex && !error && <p className="vacio">Cargando movimientos…</p>}

        {kardex && (
          <>
            <section>
              <h3>Saldo en el tiempo</h3>
              <Linea puntos={movimientos.slice(-80).map((m) => Number(m.saldo))} minimo={insumo.stock_minimo} />
              <p className="ayuda">La línea roja punteada es el stock mínimo.</p>
            </section>

            <section className="resumen-mini">
              <div><span>Compras (30 días)</span><b className="texto-verde">+{cantidadDe(suma('INGRESO', 'entrada'))} {unidad}</b></div>
              <div><span>Consumo</span><b>−{cantidadDe(suma('CONSUMO', 'salida'))} {unidad}</b></div>
              <div><span>Merma</span><b className="texto-rojo">−{cantidadDe(suma('MERMA', 'salida'))} {unidad}</b></div>
            </section>

            <section>
              <h3>Últimos movimientos</h3>
              <ul className="movimientos">
                {ultimos.map((m) => {
                  const tipo = TIPOS[m.tipo] ?? TIPOS.AJUSTE;
                  const cantidad = m.entrada ?? m.salida;
                  return (
                    <li key={m.id}>
                      <span className={`mov-tipo ${tipo.clase}`}>{tipo.texto}</span>
                      <div className="mov-detalle">
                        <b>{m.origen?.proveedor ?? m.empleado ?? 'Saldo inicial'}</b>
                        <small>{diaHora(m.fecha)}{m.origen?.lote ? ` · lote ${m.origen.lote}` : ''}{m.origen?.costo_total ? ` · ${enSoles(m.origen.costo_total)}` : ''}</small>
                      </div>
                      <span className="mono mov-cantidad">{m.entrada ? '+' : '−'}{cantidadDe(cantidad)}</span>
                      <span className="mono mov-saldo">{cantidadDe(m.saldo)} {unidad}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="ayuda">{movimientos.length} movimientos en total. El detalle completo sale en el Excel de inventario (Mermas y reportes).</p>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}

export default KardexPanel;
