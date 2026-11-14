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

  const { auth } = useAuth();
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

  const activos = empleados.filter((e) => e.estado === 'ACTIVO').length;

  return (
    <div className="pagina">
      <div className="cabecera">
        <div>
          <h1>Personal</h1>
          <p>{empleados.length} empleados · {activos} activos · solo el personal activo puede ingresar a la web y a las apps</p>
        </div>
        <button type="button" className="boton primario" onClick={() => navigate('/empleados/nuevo')}>Registrar empleado</button>
      </div>

      {error && <div className="aviso error">{error}</div>}

      <div className="tarjeta sin-relleno">
        {loading ? (
          <p className="vacio con-margen">Cargando personal...</p>
        ) : empleados.length === 0 ? (
          !error && <p className="vacio con-margen">No hay empleados registrados en tu restaurante.</p>
        ) : (
          <div className="tabla-caja">
            <table className="tabla tabla-panel">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>App</th>
                  <th>Acceso</th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((empleado) => {
                  const activo = empleado.estado === 'ACTIVO';
                  const esYo = empleado.correo === auth.correo;
                  return (
                    <tr key={empleado.id} className={activo ? undefined : 'apagada'}>
                      <td className={activo ? 'fuerte' : undefined}>{empleado.nombreCompleto}</td>
                      <td>{empleado.correo}</td>
                      <td>{nombreRol(empleado.rol)}</td>
                      <td>{appDe(empleado.rol)}</td>
                      <td>
                        {esYo ? (
                          <span className="ayuda">Tu cuenta</span>
                        ) : (
                          // HU-03: el interruptor activa o desactiva el acceso (no se borra al empleado)
                          <button
                            type="button"
                            role="switch"
                            aria-checked={activo}
                            aria-label={`Acceso de ${empleado.nombreCompleto}`}
                            className={activo ? 'interruptor encendido' : 'interruptor'}
                            disabled={cambiandoId === empleado.id}
                            onClick={() => cambiarEstado(empleado)}
                          >
                            <span className="perilla" />
                            <span className="interruptor-texto">{cambiandoId === empleado.id ? 'Guardando...' : activo ? 'Activo' : 'Inactivo'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// "ADMINISTRADOR" → "Administrador"
const nombreRol = (rol = '') => rol.charAt(0) + rol.slice(1).toLowerCase();

// Desde dónde trabaja cada rol, como en el prototipo
const appDe = (rol = '') => {
  switch (rol.toUpperCase()) {
    case 'ADMINISTRADOR': return 'Web';
    case 'COCINERO': return 'Kotlin · pantalla de cocina';
    default: return 'Kotlin · PIN';
  }
};

export default Empleados;
