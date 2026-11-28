import '../ui.css';

// El logo de GastroMind (campana con línea de nodos y chispa, de Victor): en el menú, en la barra del celular
// y en las pantallas de ingreso. Es el mismo dibujo que el favicon y que la app.
export function Marca({ tamano = 24 }) {
  return <img src="/logo.svg" width={tamano} height={tamano} alt="" aria-hidden="true" className="marca-logo" />;
}

// Panel de la izquierda en login y recuperación (rediseño v2): foto de la cocina con un velo verde,
// el logo grande, el lema y lo que hace el sistema
export function LadoIngreso() {
  return (
    <aside className="ingreso-lado">
      <div className="ingreso-logo"><Marca tamano={44} />GastroMind</div>
      <div className="ingreso-centro">
        <img src="/logo.svg" alt="" aria-hidden="true" className="ingreso-logo-grande" />
        <p className="ingreso-kicker">Costo real de cada platillo</p>
        <p className="ingreso-lema">Carta, recetas, insumos y salón de tu restaurante en un solo lugar.</p>
        <p className="ingreso-nota">El costo de cada platillo se calcula con su receta y el stock baja solo al servir.</p>
      </div>
      <ul className="ingreso-chips">
        <li><Icono d="M4 20V10M10 20V4M16 20v-7M22 20H2" />Reportes en vivo</li>
        <li><Icono d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8" />Kardex automático</li>
        <li><Icono d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM11 18h2" />App del personal con PIN</li>
      </ul>
    </aside>
  );
}

// Ícono de línea (24×24) para el menú, los indicadores y el panel de ingreso
export function Icono({ d, tamano = 16 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
