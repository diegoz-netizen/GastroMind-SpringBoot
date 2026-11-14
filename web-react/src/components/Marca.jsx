import '../ui.css';

// El logo de la campana: en el menú, en la barra del celular y en las pantallas de ingreso
export function Marca({ tamano = 24 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="#7FC4A8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 11h16a8 8 0 0 1-16 0z" />
      <path d="M8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5" />
    </svg>
  );
}

// Panel oscuro de la izquierda en login y recuperación (mismo tono que el menú lateral)
export function LadoIngreso() {
  return (
    <aside className="ingreso-lado">
      <div className="ingreso-logo"><Marca tamano={30} />GastroMind</div>
      <div>
        <p className="ingreso-lema">Carta, recetas, insumos y salón de tu restaurante en un solo lugar.</p>
        <p className="ingreso-nota">El costo de cada platillo se calcula con su receta y el stock baja solo al servir.</p>
      </div>
      <small className="ingreso-nota">Web para administración · el personal del salón usa la app con su PIN</small>
    </aside>
  );
}
