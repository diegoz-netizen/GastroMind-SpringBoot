import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SPRING_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

const API_URL = `${SPRING_URL}/api/empleados`;

const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// Mismos id que la tabla rol de script_database.sql (1 = ADMINISTRADOR no se registra desde aquí)
const ROLES = [
  { id: 2, nombre: 'Cocinero' },
  { id: 3, nombre: 'Almacenero' },
  { id: 4, nombre: 'Mozo' },
];

const FORM_VACIO = { nombreCompleto: '', correo: '', password: '', pinAcceso: '', rolId: '' };

// HU-01: el administrador registra un empleado en su restaurante (el restaurante sale del token)
function RegistrarEmpleado() {
  const [form, setForm] = useState(FORM_VACIO);
  const [erroresCampo, setErroresCampo] = useState({});
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  const { auth } = useAuth();
  const navigate = useNavigate();

  const mensajeDeError = (err) => {
    if (!err.response) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
    }
    const { status, data } = err.response;
    const detalle = data?.mensaje; // formato común {error, mensaje} (HL-014)
    if (status === 401) return detalle || 'Tu sesión no es válida o tu cuenta está inactiva.';
    if (status === 403) return detalle || 'Solo un administrador puede registrar empleados.';
    return detalle || 'Ocurrió un error al procesar la solicitud.';
  };

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErroresCampo((errores) => ({ ...errores, [name]: undefined }));
  };

  const registrar = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');
    setErroresCampo({});
    setGuardando(true);

    const datos = { ...form, rolId: form.rolId === '' ? null : Number(form.rolId) };
    if (datos.pinAcceso === '') delete datos.pinAcceso; // el PIN es opcional

    try {
      const response = await axios.post(API_URL, datos, conToken(auth.token));
      setExito(`Empleado "${response.data.nombreCompleto}" registrado. Se le envía un correo de bienvenida a ${response.data.correo}.`);
      setForm(FORM_VACIO);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'VALIDACION') {
        // 400: {error: 'VALIDACION', mensaje, campos: {campo: mensaje}} (HL-014)
        const campos = data.campos || {};
        setErroresCampo(campos);
        if (Object.keys(campos).length === 0) setError(data.mensaje);
      } else if (err.response?.status === 409) {
        // CA-04: el correo es único en todo el sistema
        setErroresCampo({ correo: data?.mensaje || 'El correo ya está registrado.' });
      } else {
        setError(mensajeDeError(err));
      }
    } finally {
      setGuardando(false);
    }
  };

  const errorDe = (campo) =>
    erroresCampo[campo] && <span style={styles.fieldError}>{erroresCampo[campo]}</span>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Registrar empleado</h1>
            <p style={styles.subtitle}>
              {auth.nombreCompleto} · {auth.rol}
            </p>
          </div>
          <button onClick={() => navigate('/empleados')} style={styles.secondaryButton}>
            Volver al personal
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {exito && <p style={styles.success}>{exito}</p>}

        <form onSubmit={registrar} style={styles.form} noValidate>
          <div style={styles.grid}>
            <label style={styles.label}>
              Nombre completo *
              <input name="nombreCompleto" value={form.nombreCompleto} onChange={cambiar} style={styles.input}
                maxLength={150} />
              {errorDe('nombreCompleto')}
            </label>
            <label style={styles.label}>
              Correo *
              <input name="correo" type="email" value={form.correo} onChange={cambiar} style={styles.input}
                maxLength={150} />
              {errorDe('correo')}
            </label>
            <label style={styles.label}>
              Contraseña inicial *
              <input name="password" type="password" value={form.password} onChange={cambiar} style={styles.input}
                autoComplete="new-password" />
              {errorDe('password')}
            </label>
            <label style={styles.label}>
              Rol *
              <select name="rolId" value={form.rolId} onChange={cambiar} style={styles.input}>
                <option value="">-- Seleccionar rol --</option>
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
              {errorDe('rolId')}
            </label>
            <label style={styles.label}>
              PIN de acceso (opcional)
              <input name="pinAcceso" type="password" inputMode="numeric" value={form.pinAcceso} onChange={cambiar}
                style={styles.input} maxLength={4} autoComplete="new-password" />
              {errorDe('pinAcceso')}
            </label>
          </div>
          <p style={styles.detail}>
            El empleado nace ACTIVO en tu restaurante y recibe por correo sus credenciales iniciales.
          </p>
          <button type="submit" disabled={guardando}
            style={{ ...styles.primaryButton, ...(guardando ? styles.buttonDisabled : {}) }}>
            {guardando ? 'Guardando...' : 'Registrar'}
          </button>
        </form>
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
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
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
    margin: '0 0 16px 0',
    fontSize: '13px',
    color: '#5f6368',
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
  success: {
    margin: '0 0 16px 0',
    padding: '10px 12px',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #ceead6',
  },
  form: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #dadce0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '14px',
    marginBottom: '16px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '13px',
    color: '#5f6368',
  },
  input: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
  },
  fieldError: {
    fontSize: '12px',
    color: '#d93025',
  },
  primaryButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: '#1a73e8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '8px 14px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#1a73e8',
    border: '1px solid #1a73e8',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

export default RegistrarEmpleado;
