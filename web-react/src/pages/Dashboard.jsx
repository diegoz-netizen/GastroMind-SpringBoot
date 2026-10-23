import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Bienvenido, {auth.nombreCompleto}</h1>
        <p style={styles.subtitle}>Rol: {auth.rol}</p>
        <p style={styles.detail}>Correo: {auth.correo}</p>
        <p style={styles.detail}>ID Empleado: {auth.empleadoId}</p>
        <p style={styles.detail}>Restaurante ID: {auth.restauranteId}</p>

        <div style={styles.tokenBox}>
          <p style={styles.tokenLabel}>Token JWT (primeros 60 caracteres):</p>
          <code style={styles.token}>
            {auth.token ? auth.token.substring(0, 60) + '...' : 'No hay token'}
          </code>
        </div>

        {auth.rol === 'ADMINISTRADOR' && (
          <button onClick={() => navigate('/empleados')} style={styles.primaryButton}>
            Gestionar empleados
          </button>
        )}

        <button onClick={() => navigate('/insumos')} style={styles.primaryButton}>
          Insumos
        </button>

        <button onClick={() => navigate('/carta')} style={styles.primaryButton}>
          Carta
        </button>

        <button onClick={logout} style={styles.logoutButton}>
          Cerrar sesion
        </button>
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
    maxWidth: '500px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    padding: '32px',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    color: '#1a73e8',
  },
  subtitle: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    color: '#5f6368',
  },
  detail: {
    margin: '6px 0',
    fontSize: '14px',
    color: '#3c4043',
  },
  tokenBox: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #dadce0',
  },
  tokenLabel: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#5f6368',
  },
  token: {
    fontSize: '11px',
    color: '#3c4043',
    wordBreak: 'break-all',
  },
  primaryButton: {
    marginTop: '24px',
    marginRight: '12px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: '#1a73e8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  logoutButton: {
    marginTop: '24px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: '#d93025',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default Dashboard;
