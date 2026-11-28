import '../ui.css';

// Piezas visuales del rediseño v2: cuadros de resumen, inicial con color, barra de nivel y gráfico de línea.

const TONOS = [['#fdf3e2', '#b0751a'], ['#e6f1ec', '#1d5b47'], ['#f1ecfa', '#6d4bb8'], ['#eaf0fb', '#3b63b5'], ['#fcebeb', '#b23a3a']];

// Mismo color siempre para el mismo nombre
const tonoDe = (nombre) => TONOS[[...nombre].reduce((suma, c) => suma + c.charCodeAt(0), 0) % TONOS.length];

export function Inicial({ texto, tamano = 40 }) {
  const [fondo, frente] = tonoDe(texto);
  return (
    <span className="inicial" style={{ background: fondo, color: frente, width: tamano, height: tamano, fontSize: tamano * 0.42 }} aria-hidden="true">
      {texto.charAt(0)}
    </span>
  );
}

// Cuadro de resumen arriba de cada pantalla: número grande, etiqueta y un detalle; tono = verde, ambar, rojo, azul
export function Resumen({ etiqueta, valor, detalle, tono = 'verde', icono }) {
  return (
    <div className={`resumen-tile ${tono}`}>
      {icono && <i className="resumen-icono" aria-hidden="true">{icono}</i>}
      <span>{etiqueta}</span>
      <b>{valor}</b>
      {detalle && <small>{detalle}</small>}
    </div>
  );
}

// Barra del stock contra el mínimo: el mínimo queda a la mitad; roja si está por debajo, ámbar si está cerca
export function BarraNivel({ actual, minimo }) {
  const a = Number(actual);
  const m = Number(minimo) || 0;
  const tope = m > 0 ? m * 2 : Math.max(a, 1);
  const lleno = Math.min(100, (a / tope) * 100);
  const estado = m > 0 && a < m ? 'bajo' : m > 0 && a < m * 1.3 ? 'cerca' : 'bien';
  return (
    <div className={`nivel ${estado}`} role="img" aria-label={`Stock ${a} de un mínimo de ${m}`}>
      <div className="nivel-relleno" style={{ width: `${lleno}%` }} />
      {m > 0 && <div className="nivel-minimo" style={{ left: '50%' }} />}
    </div>
  );
}

// Línea simple (SVG) para el saldo del kardex; la línea punteada es el mínimo
export function Linea({ puntos, minimo, alto = 120 }) {
  if (puntos.length < 2) return <p className="vacio">Todavía no hay movimientos suficientes para graficar.</p>;
  const ancho = 560;
  const max = Math.max(...puntos, Number(minimo) || 0) * 1.1 || 1;
  const x = (i) => (i / (puntos.length - 1)) * ancho;
  const y = (v) => alto - (v / max) * alto;
  const camino = puntos.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="linea" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" role="img" aria-label="Saldo del insumo en el tiempo">
      <defs>
        <linearGradient id="relleno-linea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a7a5f" stopOpacity=".28" />
          <stop offset="1" stopColor="#2a7a5f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${camino} L${ancho},${alto} L0,${alto} Z`} fill="url(#relleno-linea)" />
      <path d={camino} fill="none" stroke="#1d5b47" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      {Number(minimo) > 0 && (
        <line x1="0" x2={ancho} y1={y(Number(minimo))} y2={y(Number(minimo))} stroke="#b42318" strokeWidth="1.5" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}

// Botones de vista (Tarjetas | Tabla)
export function Vistas({ vista, onCambiar }) {
  return (
    <div className="vistas" role="tablist" aria-label="Vista">
      {[['tarjetas', 'Tarjetas'], ['tabla', 'Tabla']].map(([valor, texto]) => (
        <button key={valor} type="button" role="tab" aria-selected={vista === valor} className={vista === valor ? 'activa' : ''} onClick={() => onCambiar(valor)}>
          {texto}
        </button>
      ))}
    </div>
  );
}
