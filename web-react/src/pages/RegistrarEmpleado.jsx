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

const FORM_VACIO = { nombreCompleto: '', correo: '', pinAcceso: '', rolId: '' };

// HU-01: el administrador registra un empleado en su restaurante (el restaurante sale del token)
// HU-01-b: sin contraseña (el empleado la crea con el enlace del correo); el PIN se muestra una sola vez
function RegistrarEmpleado() {
  const [form, setForm] = useState(FORM_VACIO);
  const [erroresCampo, setErroresCampo] = useState({});
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
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
    setPinNuevo('');
    setErroresCampo({});
    setGuardando(true);

    const datos = { ...form, rolId: form.rolId === '' ? null : Number(form.rolId) };
    if (datos.pinAcceso === '') delete datos.pinAcceso; // sin PIN, la API genera uno

    try {
      const response = await axios.post(API_URL, datos, conToken(auth.token));
      setExito(`Empleado "${response.data.nombreCompleto}" registrado. Le llega un correo a ${response.data.correo} para crear su contraseña.`);
      setPinNuevo(response.data.pinAcceso);
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

  const errorDe = (campo) => erroresCampo[campo] && <span className="error-campo">{erroresCampo[campo]}</span>;

  return (
    <div className="pagina">
      <div className="cabecera">
        <div>
          <h1>Registrar empleado</h1>
          <p>Nace activo en tu restaurante y recibe un correo para crear su contraseña</p>
        </div>
        <button type="button" className="boton" onClick={() => navigate('/empleados')}>Volver al personal</button>
      </div>

      {error && <div className="aviso error">{error}</div>}
      {exito && <div className="aviso ok">{exito}</div>}
      {pinNuevo && (
        // HU-01-b: el PIN se muestra una sola vez
        <div className="tarjeta pin-caja">
          <span className="ayuda">PIN para la app</span>
          <strong className="mono pin">{pinNuevo}</strong>
          <span className="ayuda">Anótalo y entrégaselo en persona: no se vuelve a mostrar ni va en el correo.</span>
        </div>
      )}

      <form className="tarjeta formulario" onSubmit={registrar} noValidate>
        <div className="titulo-tarjeta">
          <h2>Datos del empleado</h2>
        </div>
        <div className="rejilla-campos">
          <label className="campo">Nombre completo *
            <input name="nombreCompleto" value={form.nombreCompleto} onChange={cambiar} maxLength={150} />
            {errorDe('nombreCompleto')}
          </label>
          <label className="campo">Correo *
            <input name="correo" type="email" value={form.correo} onChange={cambiar} maxLength={150} />
            {errorDe('correo')}
          </label>
          <label className="campo">Rol *
            <select name="rolId" value={form.rolId} onChange={cambiar}>
              <option value="">Elige un rol</option>
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
            {errorDe('rolId')}
          </label>
          <label className="campo">PIN de 4 dígitos (opcional)
            <input name="pinAcceso" type="password" inputMode="numeric" value={form.pinAcceso} onChange={cambiar}
              maxLength={4} autoComplete="new-password" placeholder="Si lo dejas vacío, se genera" />
            {errorDe('pinAcceso')}
          </label>
        </div>
        <p className="ayuda">
          El enlace del correo dura 24 h y es de un solo uso. Mozo y almacenero entran a la app de Kotlin con su PIN.
        </p>
        <div className="fila-acciones">
          <button type="submit" className="boton primario" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Registrar empleado'}
          </button>
          <button type="button" className="enlace" onClick={() => navigate('/empleados')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

export default RegistrarEmpleado;
