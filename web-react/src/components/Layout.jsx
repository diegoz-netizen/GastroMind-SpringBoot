import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../ui.css';

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

// Menú hamburguesa: barra arriba y el menú como cajón, para que la página use todo el ancho
function Layout({ children }) {
  const { auth, logout } = useAuth();
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const esAdmin = auth.rol?.toUpperCase() === 'ADMINISTRADOR';
  const modulos = MODULOS.filter((m) => esAdmin || !m.soloAdmin);
  const actual = modulos.find((m) => pathname.startsWith(m.ruta))?.texto;

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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7FC4A8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 11h16a8 8 0 0 1-16 0z" />
            <path d="M8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5" />
          </svg>
          GastroMind
        </div>
        {actual && <span className="barra-modulo">{actual}</span>}
        <div className="barra-usuario">
          <span>{auth.nombreCompleto}</span>
          <small>{auth.rol}</small>
        </div>
      </header>

      {abierto && <div className="nav-fondo" onClick={() => setAbierto(false)} aria-hidden="true" />}
      <nav id="menu-modulos" className={abierto ? 'nav abierto' : 'nav'} aria-label="Módulos" inert={!abierto}>
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
