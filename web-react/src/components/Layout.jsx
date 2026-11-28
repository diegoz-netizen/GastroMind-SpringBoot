import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../ui.css';
import { Icono, Marca } from './Marca';
import { CATALOGO_WEB_URL } from '../config/api';

// Módulos del prototipo; cada rol ve lo que puede usar
// Web de Operación (rediseño v2): lo que pasa hoy en el local. El catálogo, las recetas y los reportes
// están en el panel de Catálogo (Django), al que se llega con el enlace del menú.
const MODULOS = [
  { ruta: '/dashboard', texto: 'Hoy', icono: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
  { ruta: '/mesas', texto: 'Mesas del salón', soloAdmin: true, icono: 'M3 9h18M5 9v10M19 9v10M8 9V6h8v3' },
  { ruta: '/insumos', texto: 'Stock y kardex', icono: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8' },
  { ruta: '/compras', texto: 'Compras recibidas', soloAdmin: true, icono: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M5.2 18a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0M15.2 18a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0' },
  { ruta: '/mermas', texto: 'Mermas del turno', soloAdmin: true, icono: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' },
  { ruta: '/empleados', texto: 'Personal', soloAdmin: true, icono: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5' },
];

const ESCRITORIO = '(min-width: 1024px)';

// En computadora el menú queda fijo a la izquierda, como el prototipo final.
// En el celular es un cajón con el botón hamburguesa, para que la página use todo el ancho.
function Layout({ children }) {
  const { auth, logout } = useAuth();
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [escritorio, setEscritorio] = useState(() => window.matchMedia(ESCRITORIO).matches);
  const esAdmin = auth.rol?.toUpperCase() === 'ADMINISTRADOR';
  const modulos = MODULOS.filter((m) => esAdmin || !m.soloAdmin);
  const actual = modulos.find((m) => pathname.startsWith(m.ruta))?.texto;

  useEffect(() => {
    const consulta = window.matchMedia(ESCRITORIO);
    const alCambiar = (e) => setEscritorio(e.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  // Se cierra al cambiar de página y con Escape
  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    if (!abierto) return undefined;
    const alPulsar = (e) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [abierto]);

  return (
    <div className="app">
      <header className="barra">
        <button
          type="button"
          className="hamburguesa"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={abierto}
          aria-controls="menu-modulos"
          onClick={() => setAbierto((a) => !a)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="nav-marca">
          <Marca />
          GastroMind
        </div>
        {actual && <span className="barra-modulo">{actual}</span>}
        <div className="barra-usuario">
          <span>{auth.nombreCompleto}</span>
          <small>{auth.rol}</small>
        </div>
      </header>

      {abierto && <div className="nav-fondo" onClick={() => setAbierto(false)} aria-hidden="true" />}
      <nav id="menu-modulos" className={abierto ? 'nav abierto' : 'nav'} aria-label="Módulos" inert={!escritorio && !abierto}>
        <div className="nav-cabeza">
          <Marca />
          <span>GastroMind<small className="nav-sub">Operación</small></span>
        </div>
        {modulos.map((m) => (
          <NavLink key={m.ruta} to={m.ruta} className={({ isActive }) => (isActive ? 'activo' : '')}>
            <Icono d={m.icono} tamano={18} />
            {m.texto}
          </NavLink>
        ))}
        <a className="nav-catalogo" href={CATALOGO_WEB_URL} target="_blank" rel="noreferrer">
          <Icono d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5zM8 7h7M8 11h5" tamano={18} />
          <span><b>Catálogo y costos</b><small>Carta, recetas y reportes</small></span>
        </a>
        <div className="nav-pie">
          {auth.nombreCompleto}
          <br />
          {auth.rol}
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </nav>

      <div className="contenido">{children}</div>
    </div>
  );
}

export default Layout;
