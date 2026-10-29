import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DJANGO_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

// El catálogo va en Django; el token es el mismo que entrega el login de Spring
const API_URL = `${DJANGO_URL}/api/catalogo/insumos/`;

const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const UNIDADES = ['kg', 'g', 'l', 'ml', 'unidades'];
const ROLES_QUE_REGISTRAN = ['ADMINISTRADOR', 'ALMACENERO'];

const FORM_VACIO = {
  nombre: '',
  unidad_medida: 'kg',
  costo_unitario: '',
  stock_minimo: '',
  stock_actual: '',
  tipo_control: 'RECETA',
  dotacion_cantidad: '',
  dotacion_periodo: 'SEMANAL',
};

// HU-05: el encargado de almacén registra insumos con su unidad, costo y stock mínimo (CA-05)
function Insumos() {
  const [insumos, setInsumos] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [erroresCampo, setErroresCampo] = useState({});
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const puedeRegistrar = ROLES_QUE_REGISTRAN.includes(auth.rol?.toUpperCase());
  // Review 2: el costo lo ven los mismos roles que registran (la API no se lo manda al resto)
  const veCosto = puedeRegistrar;

  const mensajeDeError = (err) => {
    if (!err.response) {
      return 'No se pudo conectar con el servidor de Django. Verifica que este corriendo en ' + DJANGO_URL;
    }
    const { status, data } = err.response;
    if (status === 401) return 'Tu sesion no es valida o tu cuenta esta inactiva. Vuelve a iniciar sesion.';
    if (status === 403) return 'Solo un administrador o el encargado de almacen puede registrar insumos.';
    return data?.mensaje || 'Ocurrio un error al procesar la solicitud.';
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await axios.get(API_URL, conToken(auth.token));
        setInsumos(response.data);
      } catch (err) {
        setError(mensajeDeError(err));
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [auth.token]);

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

    const datos = { ...form };
    if (datos.stock_actual === '') delete datos.stock_actual;
    if (datos.tipo_control === 'RECETA') {
      delete datos.dotacion_cantidad;
      delete datos.dotacion_periodo;
    }

    try {
      const response = await axios.post(API_URL, datos, conToken(auth.token));
      // 201: se agrega a la tabla manteniendo el orden por nombre, como lo devuelve el GET
      setInsumos((lista) =>
        [...lista, response.data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      );
      setExito(`Insumo "${response.data.nombre}" registrado.`);
      setForm(FORM_VACIO);
    } catch (err) {
      // 400 de CA-05: Django devuelve {error: 'VALIDACION', mensaje, campos: {campo: mensaje}} (HL-014)
      if (err.response?.data?.error === 'VALIDACION') {
        const campos = err.response.data.campos || {};
        setErroresCampo(campos);
        // Error de validación sin campo concreto: se muestra arriba
        if (Object.keys(campos).length === 0) setError(err.response.data.mensaje);
      } else {
        setError(mensajeDeError(err));
      }
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSesion = () => {
    logout();
    navigate('/');
  };

  const errorDe = (campo) =>
    erroresCampo[campo] && <span style={styles.fieldError}>{erroresCampo[campo]}</span>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Insumos del almacen</h1>
            <p style={styles.subtitle}>
              {auth.nombreCompleto} · {auth.rol}
            </p>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => navigate('/dashboard')} style={styles.secondaryButton}>
              Volver
            </button>
            <button onClick={cerrarSesion} style={styles.logoutButton}>
              Cerrar sesion
            </button>
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {exito && <p style={styles.success}>{exito}</p>}

        {puedeRegistrar && (
          <form onSubmit={registrar} style={styles.form} noValidate>
            <h2 style={styles.formTitle}>Registrar insumo</h2>
            <div style={styles.grid}>
              <label style={styles.label}>
                Nombre *
                <input name="nombre" value={form.nombre} onChange={cambiar} style={styles.input} maxLength={150} />
                {errorDe('nombre')}
              </label>
              <label style={styles.label}>
                Unidad de medida *
                <select name="unidad_medida" value={form.unidad_medida} onChange={cambiar} style={styles.input}>
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                {errorDe('unidad_medida')}
              </label>
              <label style={styles.label}>
                Costo unitario (S/) *
                <input name="costo_unitario" type="number" step="0.01" min="0.01" value={form.costo_unitario}
                  onChange={cambiar} style={styles.input} />
                {errorDe('costo_unitario')}
              </label>
              <label style={styles.label}>
                Stock minimo *
                <input name="stock_minimo" type="number" step="0.01" min="0.01" value={form.stock_minimo}
                  onChange={cambiar} style={styles.input} />
                {errorDe('stock_minimo')}
              </label>
              <label style={styles.label}>
                Stock actual
                <input name="stock_actual" type="number" step="0.01" min="0" value={form.stock_actual}
                  onChange={cambiar} style={styles.input} placeholder="0" />
                {errorDe('stock_actual')}
              </label>
              <label style={styles.label}>
                Tipo de control
                <select name="tipo_control" value={form.tipo_control} onChange={cambiar} style={styles.input}>
                  <option value="RECETA">RECETA (se descuenta por receta)</option>
                  <option value="LIBRE">LIBRE (dotacion fija)</option>
                </select>
                {errorDe('tipo_control')}
              </label>
              {form.tipo_control === 'LIBRE' && (
                <>
                  <label style={styles.label}>
                    Dotacion *
                    <input name="dotacion_cantidad" type="number" step="0.01" min="0.01"
                      value={form.dotacion_cantidad} onChange={cambiar} style={styles.input} />
                    {errorDe('dotacion_cantidad')}
                  </label>
                  <label style={styles.label}>
                    Periodo *
                    <select name="dotacion_periodo" value={form.dotacion_periodo} onChange={cambiar}
                      style={styles.input}>
                      <option value="SEMANAL">Semanal</option>
                      <option value="MENSUAL">Mensual</option>
                    </select>
                    {errorDe('dotacion_periodo')}
                  </label>
                </>
              )}
            </div>
            <button type="submit" disabled={guardando}
              style={{ ...styles.primaryButton, ...(guardando ? styles.buttonDisabled : {}) }}>
              {guardando ? 'Guardando...' : 'Registrar'}
            </button>
          </form>
        )}

        {loading ? (
          <p style={styles.detail}>Cargando insumos...</p>
        ) : insumos.length === 0 && !error ? (
          <p style={styles.detail}>No hay insumos registrados en tu restaurante.</p>
        ) : (
          insumos.length > 0 && (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Unidad</th>
                  <th style={styles.thNum}>Stock actual</th>
                  <th style={styles.thNum}>Stock minimo</th>
                  {veCosto && <th style={styles.thNum}>Costo (S/)</th>}
                  <th style={styles.th}>Control</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {insumos.map((insumo) => (
                  <tr key={insumo.id}>
                    <td style={styles.td}>{insumo.nombre}</td>
                    <td style={styles.td}>{insumo.unidad_medida}</td>
                    <td style={styles.tdNum}>{insumo.stock_actual}</td>
                    <td style={styles.tdNum}>{insumo.stock_minimo}</td>
                    {veCosto && <td style={styles.tdNum}>{insumo.costo_unitario}</td>}
                    <td style={styles.td}>{insumo.tipo_control}</td>
                    <td style={styles.td}>
                      {insumo.bajo_stock_minimo && <span style={styles.badgeAlerta}>Bajo minimo</span>}
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
  headerButtons: {
    display: 'flex',
    gap: '8px',
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
    marginBottom: '28px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #dadce0',
  },
  formTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    color: '#3c4043',
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
  thNum: {
    textAlign: 'right',
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
  tdNum: {
    padding: '10px 8px',
    borderBottom: '1px solid #f1f3f4',
    color: '#3c4043',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  badgeAlerta: {
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#fef7e0',
    color: '#b06000',
    fontSize: '12px',
    whiteSpace: 'nowrap',
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

export default Insumos;
