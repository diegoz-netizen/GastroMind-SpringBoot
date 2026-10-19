import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { SPRING_URL } from '../config/api';
import { styles } from './recuperacionStyles';

// HU-04: pedir el enlace de recuperación. El backend responde igual exista o no el correo.
const API_URL = `${SPRING_URL}/api/auth/recuperar`;

function OlvideContrasena() {
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!correo.trim()) {
      setError('Ingresa tu correo.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(API_URL, { correo: correo.trim() });
      setMensaje(response.data.mensaje);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'VALIDACION') {
        setError(data.campos?.correo || data.mensaje);
      } else if (err.response) {
        // HL-035: 429 DEMASIADAS_SOLICITUDES y cualquier otro error traen su mensaje (HL-014)
        setError(data?.mensaje || 'Ocurrió un error al procesar la solicitud.');
      } else {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>GastroMind</h1>
        <h2 style={styles.subtitle}>Recuperar contraseña</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="correo" style={styles.label}>
              Correo electrónico
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

          {error && <p style={styles.error}>{error}</p>}
          {mensaje && <p style={styles.success}>{mensaje}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <Link to="/" style={styles.link}>
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}

export default OlvideContrasena;
