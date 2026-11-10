import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SPRING_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

const API_URL = `${SPRING_URL}/api/auth/login`;

function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validacion: ambos campos deben estar llenos
    if (!correo.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(API_URL, {
        correo: correo.trim(),
        password: password,
      });

      // 200 OK: login exitoso
      if (response.status === 200) {
        const data = response.data;
        login(data);
        navigate('/dashboard');
      }
    } catch (err) {
      // 401 Unauthorized: credenciales invalidas o cuenta inactiva → {error, mensaje} (HL-014)
      if (err.response && err.response.status === 401) {
        setError(err.response.data?.mensaje || 'Credenciales invalidas');
      } else {
        setError('No se pudo conectar con el servidor. Verifica que el backend este corriendo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>GastroMind</h1>
        <h2 style={styles.subtitle}>Iniciar Sesion</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="correo" style={styles.label}>
              Correo electronico
            </label>
            <input
              id="correo"
              type="email"
              placeholder="ejemplo@gastromind.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              style={styles.input}
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              placeholder="Tu contrasena"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
          </button>
        </form>

        <Link to="/recuperar" style={styles.link}>
          Olvidé mi contraseña
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F1',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '28px',
    color: '#1D5B47',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 24px 0',
    fontSize: '18px',
    color: '#5f6368',
    textAlign: 'center',
    fontWeight: 'normal',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#3c4043',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    outline: 'none',
  },
  error: {
    margin: '0',
    padding: '10px 12px',
    backgroundColor: '#fce8e6',
    color: '#d93025',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #f5c6cb',
  },
  button: {
    padding: '12px',
    fontSize: '15px',
    fontWeight: '600',
    backgroundColor: '#1D5B47',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  buttonDisabled: {
    backgroundColor: '#94c4f5',
    cursor: 'not-allowed',
  },
  link: {
    display: 'block',
    marginTop: '16px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#1D5B47',
    textDecoration: 'none',
  },
};

export default Login;
