import { useState } from 'react';
import { LadoIngreso } from '../components/Marca';
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

    // Validación: ambos campos deben estar llenos
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
        setError(err.response.data?.mensaje || 'Credenciales inválidas');
      } else {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ingreso">
      <LadoIngreso />
      <div className="ingreso-tarjeta">
        <h2 className="ingreso-titulo">Iniciar sesión</h2>
        <p className="ayuda">Entra con tu correo y la contraseña que creaste con el enlace del correo.</p>

        <form onSubmit={handleSubmit} className="ingreso-form">
          <div className="campo">
            <label htmlFor="correo" className="campo-etiqueta">
              Correo electrónico
            </label>
            <input
              id="correo"
              type="email"
              placeholder="ejemplo@gastromind.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="campo">
            <label htmlFor="password" className="campo-etiqueta">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="aviso error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="boton primario ancho"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <Link to="/recuperar" className="enlace ingreso-enlace">
          Olvidé mi contraseña
        </Link>
      </div>
    </div>
  );
}

export default Login;
