import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SPRING_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

const API_URL = `${SPRING_URL}/api/empleados`;

const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// HU-03: el administrador ve el personal de su restaurante y lo activa o desactiva
function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cambiandoId, setCambiandoId] = useState(null);

  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const mensajeDeError = (err) => {
    if (!err.response) {
      return 'No se pudo conectar con el servidor. Verifica que el backend este corriendo.';
    }
    const { status, data } = err.response;
    const detalle = data?.mensaje; // formato comun {error, mensaje} (HL-014)
    if (status === 401) return detalle || 'Tu sesion no es valida o tu cuenta esta inactiva.';
    if (status === 403) return detalle || 'Solo un administrador activo puede gestionar el personal.';
    if (status === 404) return detalle || 'El empleado no existe en tu restaurante.';
    if (status === 409) return detalle || 'No puedes desactivar tu propia cuenta.';
    return detalle || 'Ocurrio un error al procesar la solicitud.';
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await axios.get(API_URL, conToken(auth.token));
        setEmpleados(response.data);
      } catch (err) {
        setError(mensajeDeError(err));
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [auth.token]);

  const cambiarEstado = async (empleado) => {
    const nuevoEstado = empleado.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    setError('');
    setCambiandoId(empleado.id);

    try {
      const response = await axios.patch(
        `${API_URL}/${empleado.id}/estado`,
        { estado: nuevoEstado },
        conToken(auth.token)
      );
      // 200 OK: se reemplaza solo la fila que cambio
      setEmpleados((lista) => lista.map((e) => (e.id === empleado.id ? response.data : e)));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCambiandoId(null);
    }
  };

  const cerrarSesion = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Personal del restaurante</h1>
            <p style={styles.subtitle}>
              {auth.nombreCompleto} · {auth.rol}
            </p>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => navigate('/empleados/nuevo')} style={styles.registrarButton}>
              Registrar empleado
            </button>
            <button onClick={cerrarSesion} style={styles.logoutButton}>
              Cerrar sesion
            </button>
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {loading ? (
          <p style={styles.detail}>Cargando personal...</p>
        ) : empleados.length === 0 && !error ? (
          <p style={styles.detail}>No hay empleados registrados en tu restaurante.</p>
        ) : (
          empleados.length > 0 && (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Correo</th>
                  <th style={styles.th}>Rol</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((empleado) => {
                  const activo = empleado.estado === 'ACTIVO';
                  return (
                    <tr key={empleado.id}>
                      <td style={styles.td}>{empleado.nombreCompleto}</td>
                      <td style={styles.td}>{empleado.correo}</td>
                      <td style={styles.td}>{empleado.rol}</td>
                      <td style={styles.td}>
                        <span style={activo ? styles.badgeActivo : styles.badgeInactivo}>
                          {empleado.estado}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => cambiarEstado(empleado)}
                          disabled={cambiandoId === empleado.id}
                          style={{
                            ...(activo ? styles.buttonDesactivar : styles.buttonActivar),
                            ...(cambiandoId === empleado.id ? styles.buttonDisabled : {}),
                          }}
                        >
                          {cambiandoId === empleado.id ? 'Guardando...' : activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
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
    maxWidth: '900px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    padding: '32px',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
    overflowX: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
  },
  headerButtons: {
    display: 'flex',
    gap: '8px',
  },
  registrarButton: {
    padding: '8px 14px',
    fontSize: '14px',
    backgroundColor: '#1a73e8',
    color: '#ffffff',
    border: '1px solid #1a73e8',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    color: '#1a73e8',
  },
  subtitle: {
    margin: 0,
    fontSize: '15px',
    color: '#5f6368',
  },
  detail: {
    margin: '6px 0',
    fontSize: '14px',
    color: '#3c4043',
  },
  error: {
    margin: '0 0 16px 0',
    padding: '10px 12px',
    backgroundColor: '#fce8e6',
    color: '#d93025',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #f5c6cb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 8px',
    borderBottom: '2px solid #dadce0',
    color: '#5f6368',
    fontWeight: '500',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #f1f3f4',
    color: '#3c4043',
  },
  badgeActivo: {
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    fontSize: '12px',
  },
  badgeInactivo: {
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#f1f3f4',
    color: '#5f6368',
    fontSize: '12px',
  },
  buttonDesactivar: {
    padding: '6px 12px',
    fontSize: '13px',
    backgroundColor: '#ffffff',
    color: '#d93025',
    border: '1px solid #d93025',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonActivar: {
    padding: '6px 12px',
    fontSize: '13px',
    backgroundColor: '#1a73e8',
    color: '#ffffff',
    border: '1px solid #1a73e8',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
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

export default Empleados;
