import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PanelReporte from '../components/reportes/PanelReporte';
import MermaReporte from '../components/reportes/MermaReporte';
import ConsumoReporte from '../components/reportes/ConsumoReporte';
import SugerenciaReporte from '../components/reportes/SugerenciaReporte';
import ProveedoresReporte from '../components/reportes/ProveedoresReporte';
import ExportarReporte from '../components/reportes/ExportarReporte';

// Sprint 4: una pestaña por HU. Cada HU reemplaza solo su archivo de components/reportes.
const PESTANAS = [
  { id: 'panel', titulo: 'Panel', hu: 'HU-23', Componente: PanelReporte },
  { id: 'merma', titulo: 'Merma', hu: 'HU-19', Componente: MermaReporte },
  { id: 'consumo', titulo: 'Teórico vs. real', hu: 'HU-20', Componente: ConsumoReporte },
  { id: 'sugerencia', titulo: 'Sugerencia de compra', hu: 'HU-21', Componente: SugerenciaReporte },
  { id: 'proveedores', titulo: 'Proveedores', hu: 'HU-22', Componente: ProveedoresReporte },
  { id: 'exportar', titulo: 'Exportar', hu: 'HU-24', Componente: ExportarReporte },
];

function Reportes() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [activa, setActiva] = useState(PESTANAS[0].id);
  const esAdmin = auth.rol?.toUpperCase() === 'ADMINISTRADOR';
  const { Componente } = PESTANAS.find((p) => p.id === activa);

  const cerrarSesion = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Reportes</h1>
            <p style={styles.subtitle}>
              {auth.nombreCompleto} · {auth.rol}
            </p>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => navigate('/dashboard')} style={styles.secondaryButton}>
              Volver
            </button>
            <button onClick={cerrarSesion} style={styles.logoutButton}>
              Cerrar sesion
            </button>
          </div>
        </div>

        {!esAdmin ? (
          <p style={styles.error}>Solo el administrador puede ver los reportes.</p>
        ) : (
          <>
            <div role="tablist" style={styles.pestanas}>
              {PESTANAS.map((p) => (
                <button key={p.id} role="tab" aria-selected={p.id === activa} onClick={() => setActiva(p.id)}
                  style={p.id === activa ? { ...styles.pestana, ...styles.pestanaActiva } : styles.pestana}>
                  {p.titulo}
                </button>
              ))}
            </div>
            <Componente token={auth.token} />
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '40px 20px',
  },
  card: {
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    padding: '32px',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
    overflowX: 'auto',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  headerButtons: { display: 'flex', gap: '8px' },
  title: { margin: '0 0 8px 0', fontSize: '24px', color: '#1a73e8' },
  subtitle: { margin: 0, fontSize: '15px', color: '#5f6368' },
  error: {
    padding: '10px 12px',
    backgroundColor: '#fce8e6',
    color: '#d93025',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #f5c6cb',
  },
  pestanas: { display: 'flex', flexWrap: 'wrap', gap: '4px', borderBottom: '2px solid #dadce0', marginBottom: '20px' },
  pestana: {
    padding: '10px 14px',
    border: 'none',
    borderBottom: '3px solid transparent',
    background: 'none',
    color: '#5f6368',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '-2px',
  },
  pestanaActiva: { color: '#1a73e8', borderBottom: '3px solid #1a73e8', fontWeight: '600' },
  secondaryButton: {
    padding: '8px 14px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#1a73e8',
    border: '1px solid #1a73e8',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  logoutButton: {
    padding: '8px 14px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#d93025',
    border: '1px solid #d93025',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default Reportes;
