import { useState } from 'react';
import { LadoIngreso } from '../components/Marca';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { SPRING_URL } from '../config/api';

// HU-04: se llega desde el enlace del correo (/restablecer?token=...). El enlace caduca y es de un solo uso.
// HU-01-b: el correo de bienvenida usa el mismo enlace con &bienvenida=1, para crear la primera contraseña.
const API_URL = `${SPRING_URL}/api/auth/restablecer`;

function RestablecerContrasena() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const bienvenida = searchParams.get('bienvenida') === '1';

  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [erroresCampo, setErroresCampo] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErroresCampo({});

    if (nuevaContrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nuevaContrasena !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(API_URL, { token, nuevaContrasena });
      setMensaje(response.data.mensaje);
    } catch (err) {
      const data = err.response?.data;
      // HL-038: un 400 de validación trae {error: 'VALIDACION', campos} (HL-014); solo el resto es enlace inválido
      if (data?.error === 'VALIDACION') {
        const campos = data.campos || {};
        setErroresCampo(campos);
        // El token va oculto en la URL: su error se muestra arriba
        if (campos.token || !campos.nuevaContrasena) setError(campos.token || data.mensaje);
      } else if (err.response) {
        setError(data?.mensaje || 'El enlace no es válido o ya caducó. Solicita uno nuevo.');
      } else {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="ingreso">
      <LadoIngreso />
        <div className="ingreso-tarjeta">
          <p className="aviso error">El enlace no es válido. Solicita uno nuevo.</p>
          <Link to="/recuperar" className="enlace ingreso-enlace">
            Pedir un enlace nuevo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ingreso">
      <LadoIngreso />
      <div className="ingreso-tarjeta">
        <h2 className="ingreso-titulo">{bienvenida ? 'Bienvenido: crea tu contraseña' : 'Nueva contraseña'}</h2>

        {mensaje ? (
          <>
            <p className="aviso ok">{mensaje}</p>
            <Link to="/" className="enlace ingreso-enlace">
              Ir a iniciar sesión
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="ingreso-form">
            <div className="campo">
              <label htmlFor="nueva" className="campo-etiqueta">
                Nueva contraseña
              </label>
              <input
                id="nueva"
                type="password"
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                autoComplete="new-password"
              />
              {erroresCampo.nuevaContrasena && (
                <span className="error-campo">{erroresCampo.nuevaContrasena}</span>
              )}
            </div>

            <div className="campo">
              <label htmlFor="confirmacion" className="campo-etiqueta">
                Repite la contraseña
              </label>
              <input
                id="confirmacion"
                type="password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="aviso error">{error}</p>}

            <button
              type="submit"
              disabled={loading}
            className="boton primario ancho"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default RestablecerContrasena;
