import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SPRING_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import MesaFormulario from '../components/mesas/MesaFormulario';

const API_URL = `${SPRING_URL}/api/mesas`;

const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// HU-26: el administrador registra y edita las mesas del salón (número, capacidad y zona).
// El estado (LIBRE u OCUPADA) no se edita aquí: lo cambian los pedidos del mozo.
function Mesas() {
  const [mesas, setMesas] = useState([]);
  const [editando, setEditando] = useState(null); // null = formulario de mesa nueva
  const [error, setError] = useState('');
  const [erroresCampo, setErroresCampo] = useState({});
  const [aviso, setAviso] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [versionFormulario, setVersionFormulario] = useState(0); // al subir, el formulario se vacía

  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const mensajeDeError = (err) => {
    if (!err.response) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
    }
    const { status, data } = err.response;
    const detalle = data?.mensaje; // formato común {error, mensaje, campos} (HL-014)
    if (status === 401) return detalle || 'Tu sesión no es válida o tu cuenta está inactiva.';
    if (status === 403) return detalle || 'Solo el administrador puede gestionar las mesas.';
    if (status === 404) return detalle || 'La mesa no existe en tu restaurante.';
    return detalle || 'Ocurrió un error al procesar la solicitud.';
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await axios.get(API_URL, conToken(auth.token));
        setMesas(response.data);
      } catch (err) {
        setError(mensajeDeError(err));
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [auth.token]);

  const guardar = async (datos) => {
    setError('');
    setErroresCampo({});
    setAviso('');
    setGuardando(true);
    try {
      if (editando) {
        const response = await axios.put(`${API_URL}/${editando.id}`, datos, conToken(auth.token));
        setMesas((lista) =>
          lista.map((m) => (m.id === editando.id ? response.data : m)).sort((a, b) => a.numero - b.numero)
        );
        setAviso(`Mesa ${response.data.numero} actualizada.`);
        setEditando(null);
      } else {
        const response = await axios.post(API_URL, datos, conToken(auth.token));
        setMesas((lista) => [...lista, response.data].sort((a, b) => a.numero - b.numero));
        setAviso(`Mesa ${response.data.numero} registrada.`);
        setVersionFormulario((v) => v + 1);
      }
    } catch (err) {
      setErroresCampo(err.response?.data?.campos || {});
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const empezarEdicion = (mesa) => {
    setEditando(mesa);
    setError('');
    setErroresCampo({});
    setAviso('');
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
            <h1 style={styles.title}>Mesas del salón</h1>
            <p style={styles.subtitle}>
              {auth.nombreCompleto} · {auth.rol}
            </p>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => navigate('/dashboard')} style={styles.volverButton}>
              Volver
            </button>
            <button onClick={cerrarSesion} style={styles.logoutButton}>
              Cerrar sesión
            </button>
          </div>
        </div>

        <MesaFormulario
          key={`${editando?.id ?? 'nueva'}-${versionFormulario}`}
          mesa={editando}
          guardando={guardando}
          erroresCampo={erroresCampo}
          onGuardar={guardar}
          onCancelar={() => empezarEdicion(null)}
        />

        {error && <p style={styles.error}>{error}</p>}
        {aviso && <p style={styles.ok}>{aviso}</p>}

        {loading ? (
          <p style={styles.detail}>Cargando mesas...</p>
        ) : mesas.length === 0 && !error ? (
          <p style={styles.detail}>Todavía no hay mesas registradas en tu restaurante.</p>
        ) : (
          mesas.length > 0 && (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Mesa</th>
                  <th style={styles.th}>Capacidad</th>
                  <th style={styles.th}>Zona</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {mesas.map((mesa) => (
                  <tr key={mesa.id} style={editando?.id === mesa.id ? styles.filaEditando : undefined}>
                    <td style={styles.td}>{mesa.numero}</td>
                    <td style={styles.td}>
                      {mesa.capacidad} {mesa.capacidad === 1 ? 'persona' : 'personas'}
                    </td>
                    <td style={styles.td}>{mesa.zona}</td>
                    <td style={styles.td}>
                      <span style={mesa.estado === 'LIBRE' ? styles.badgeLibre : styles.badgeOcupada}>
                        {mesa.estado}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => empezarEdicion(mesa)} style={styles.editarButton}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
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
  headerButtons: { display: 'flex', gap: '8px' },
  title: { margin: '0 0 8px 0', fontSize: '24px', color: '#1a73e8' },
  subtitle: { margin: 0, fontSize: '15px', color: '#5f6368' },
  detail: { margin: '6px 0', fontSize: '14px', color: '#3c4043' },
  error: {
    margin: '0 0 16px 0',
    padding: '10px 12px',
    backgroundColor: '#fce8e6',
    color: '#d93025',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #f5c6cb',
  },
  ok: {
    margin: '0 0 16px 0',
    padding: '10px 12px',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #ceead6',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    textAlign: 'left',
    padding: '10px 8px',
    borderBottom: '2px solid #dadce0',
    color: '#5f6368',
    fontWeight: '500',
  },
  td: { padding: '10px 8px', borderBottom: '1px solid #f1f3f4', color: '#3c4043' },
  filaEditando: { backgroundColor: '#e8f0fe' },
  badgeLibre: {
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    fontSize: '12px',
  },
  badgeOcupada: {
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#fef7e0',
    color: '#b06000',
    fontSize: '12px',
  },
  editarButton: {
    padding: '6px 12px',
    fontSize: '13px',
    backgroundColor: '#ffffff',
    color: '#1a73e8',
    border: '1px solid #1a73e8',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  volverButton: {
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

export default Mesas;
