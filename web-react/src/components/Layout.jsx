import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../ui.css';
import { Marca } from './Marca';

// Módulos del prototipo; cada rol ve lo que puede usar
const MODULOS = [
  { ruta: '/dashboard', texto: 'Panel' },
  { ruta: '/carta', texto: 'Carta y recetas' },
  { ruta: '/insumos', texto: 'Insumos y kardex' },
  { ruta: '/compras', texto: 'Compras y proveedores', soloAdmin: true },
  { ruta: '/reportes', texto: 'Mermas y reportes', soloAdmin: true },
  { ruta: '/empleados', texto: 'Personal', soloAdmin: true },
  { ruta: '/mesas', texto: 'Mesas del salón', soloAdmin: true },
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
          GastroMind
        </div>
        {modulos.map((m) => (
          <NavLink key={m.ruta} to={m.ruta} className={({ isActive }) => (isActive ? 'activo' : '')}>
            {m.texto}
          </NavLink>
        ))}
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
