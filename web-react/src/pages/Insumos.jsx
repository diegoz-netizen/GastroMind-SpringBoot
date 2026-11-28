import { useEffect, useState } from 'react';
import axios from 'axios';
import { DJANGO_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ALERTAS_URL, cuandoVence, diaMes } from '../config/alertas';
import ClasificarInsumo from '../components/ClasificarInsumo';
import { enSolesEnteros, unidadDe } from '../config/reportes';
import KardexPanel from '../components/KardexPanel';
import { BarraNivel, Inicial, Resumen, Vistas } from '../components/Visual';

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
  tipo_control: 'RECETA',
  dotacion_cantidad: '',
  dotacion_periodo: 'SEMANAL',
};

// Filtros rápidos de la vista (rediseño v2); 'vencer' depende de las alertas y se resuelve en la pantalla
const FILTROS = [['todos', 'Todos'], ['bajo', 'Bajo el mínimo'], ['vencer', 'Por vencer'], ['receta', 'Receta'], ['libre', 'Libre']];
const FILTRO = {
  todos: () => true,
  bajo: (i) => i.bajo_stock_minimo,
  vencer: () => true,
  receta: (i) => i.tipo_control === 'RECETA',
  libre: (i) => i.tipo_control === 'LIBRE',
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
  const [lotePorInsumo, setLotePorInsumo] = useState({});
  const [formAbierto, setFormAbierto] = useState(false);
  // Rediseño v2: vista en tarjetas o tabla, filtros rápidos, búsqueda y el kardex del insumo elegido
  const [vista, setVista] = useState('tarjetas');
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [kardexDe, setKardexDe] = useState(null);

  const { auth } = useAuth();
  const puedeRegistrar = ROLES_QUE_REGISTRAN.includes(auth.rol?.toUpperCase());
  // Review 2: el costo lo ven los mismos roles que registran (la API no se lo manda al resto)
  const veCosto = puedeRegistrar;
  const esAdmin = auth.rol?.toUpperCase() === 'ADMINISTRADOR';

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

  // HU-16: lotes por vencer, solo para admin y almacenero (los mismos roles de las alertas)
  useEffect(() => {
    if (!puedeRegistrar) return;
    const cargarAlertas = async () => {
      try {
        const response = await axios.get(ALERTAS_URL, conToken(auth.token));
        const porInsumo = {};
        response.data.vencimiento.forEach((lote) => {
          if (!porInsumo[lote.insumo]) porInsumo[lote.insumo] = lote;
        });
        setLotePorInsumo(porInsumo);
      } catch {
        // Si fallan las alertas, la tabla se ve igual, solo sin el vencimiento
      }
    };
    cargarAlertas();
  }, [auth.token, puedeRegistrar]);

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
      // El insumo nace con stock 0: el stock entra con el ingreso de compras (HU-14), que deja su movimiento
      setExito(`Insumo "${response.data.nombre}" registrado con stock 0. El stock entra con el ingreso de compras.`);
      setForm(FORM_VACIO);
      setFormAbierto(false);
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

  const errorDe = (campo) => erroresCampo[campo] && <span className="error-campo">{erroresCampo[campo]}</span>;

  // HU-16: qué decir del lote que vence primero (la API los manda ordenados por fecha)
  const vencimiento = (lote) =>
    lote.vencido ? `Venció el ${diaMes(lote.fecha_vencimiento)}`
      : lote.dias_restantes === 0 ? 'Vence hoy' : `Vence ${cuandoVence(lote)}`;

  // Rediseño v2: lo urgente primero (bajo el mínimo, luego por vencer) y después por nombre
  const urgencia = (i) => (i.bajo_stock_minimo ? 0 : lotePorInsumo[i.nombre] ? 1 : 2);
  const buscado = busqueda.trim().toLowerCase();
  const visibles = insumos
    .filter(filtro === 'vencer' ? (i) => Boolean(lotePorInsumo[i.nombre]) : FILTRO[filtro])
    .filter((i) => !buscado || i.nombre.toLowerCase().includes(buscado))
    .sort((a, b) => urgencia(a) - urgencia(b) || a.nombre.localeCompare(b.nombre, 'es'));
  const bajos = insumos.filter((i) => i.bajo_stock_minimo);
  const porVencer = insumos.filter((i) => lotePorInsumo[i.nombre]);
  const valorInventario = insumos.reduce((suma, i) => suma + Number(i.stock_actual) * Number(i.costo_unitario ?? 0), 0);

  return (
    <div className="pagina">
      <div className="cabecera">
        <div>
          <h1>Insumos y kardex</h1>
          <p>Lo urgente primero. Toca un insumo para ver su kardex: qué entró, qué salió y cómo cambió su saldo.</p>
        </div>
        {puedeRegistrar && (
          <button type="button" className="boton primario" onClick={() => { setExito(''); setFormAbierto(true); }}>
            Nuevo insumo
          </button>
        )}
      </div>

      {error && <div className="aviso error">{error}</div>}
      {exito && <div className="aviso ok">{exito}</div>}

      {formAbierto && (
        <div className="modal-fondo">
          <form className="modal modal-ancho" onSubmit={registrar} noValidate>
            <h2>Nuevo insumo</h2>
            <div className="rejilla-campos">
              <label className="campo">Nombre *
                <input name="nombre" value={form.nombre} onChange={cambiar} maxLength={150} />
                {errorDe('nombre')}
              </label>
              <label className="campo">Unidad de medida *
                <select name="unidad_medida" value={form.unidad_medida} onChange={cambiar}>
                  {UNIDADES.map((u) => <option key={u} value={u}>{unidadDe(u)}</option>)}
                </select>
                {errorDe('unidad_medida')}
              </label>
              <label className="campo">Costo unitario (S/) *
                <input name="costo_unitario" type="number" step="0.01" min="0.01" value={form.costo_unitario} onChange={cambiar} />
                {errorDe('costo_unitario')}
              </label>
              <label className="campo">Stock mínimo *
                <input name="stock_minimo" type="number" step="0.001" min="0.001" value={form.stock_minimo} onChange={cambiar} />
                {errorDe('stock_minimo')}
              </label>
              <label className="campo">Tipo de control
                <select name="tipo_control" value={form.tipo_control} onChange={cambiar}>
                  <option value="RECETA">RECETA (se descuenta por receta)</option>
                  <option value="LIBRE">LIBRE (dotación fija)</option>
                </select>
                {errorDe('tipo_control')}
              </label>
              {form.tipo_control === 'LIBRE' && (
                <>
                  <label className="campo">Dotación *
                    <input name="dotacion_cantidad" type="number" step="0.001" min="0.001" value={form.dotacion_cantidad} onChange={cambiar} />
                    {errorDe('dotacion_cantidad')}
                  </label>
                  <label className="campo">Periodo *
                    <select name="dotacion_periodo" value={form.dotacion_periodo} onChange={cambiar}>
                      <option value="SEMANAL">Semanal</option>
                      <option value="MENSUAL">Mensual</option>
                    </select>
                    {errorDe('dotacion_periodo')}
                  </label>
                </>
              )}
            </div>
            <p className="ayuda">El insumo nace con stock 0: el stock entra con el ingreso de compras.</p>
            <div className="fila-acciones">
              <button type="submit" className="boton primario" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar'}</button>
              <button type="button" className="boton" onClick={() => setFormAbierto(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {!loading && insumos.length > 0 && (
        <>
          <section className="resumenes">
            <Resumen etiqueta="Insumos" valor={insumos.length} detalle={`${insumos.filter((i) => i.tipo_control === 'LIBRE').length} de control libre`} tono="verde" />
            <Resumen etiqueta="Bajo el mínimo" valor={bajos.length} detalle={bajos.length ? 'Comprar pronto' : 'Todo en orden'} tono={bajos.length ? 'rojo' : 'verde'} />
            <Resumen etiqueta="Por vencer" valor={porVencer.length} detalle={porVencer.length ? 'Úsalos primero' : 'Sin lotes por vencer'} tono={porVencer.length ? 'ambar' : 'verde'} />
            {veCosto && <Resumen etiqueta="Valor del inventario" valor={enSolesEnteros(valorInventario)} detalle="Stock × costo unitario" tono="azul" />}
          </section>

          <div className="barra-herramientas">
            <input className="buscador" type="search" placeholder="Buscar insumo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar insumo" />
            <div className="chips-filtro">
              {FILTROS.map(([valor, texto]) => (
                <button key={valor} type="button" className={filtro === valor ? 'chip-filtro activo' : 'chip-filtro'} onClick={() => setFiltro(valor)}>
                  {texto} · {valor === 'vencer' ? porVencer.length : insumos.filter(FILTRO[valor]).length}
                </button>
              ))}
            </div>
            <Vistas vista={vista} onCambiar={setVista} />
          </div>
        </>
      )}

      {loading ? (
        <div className="tarjeta"><p className="vacio">Cargando insumos...</p></div>
      ) : insumos.length === 0 ? (
        !error && <div className="tarjeta"><p className="vacio">No hay insumos registrados en tu restaurante.</p></div>
      ) : visibles.length === 0 ? (
        <div className="tarjeta"><p className="vacio">Ningún insumo coincide con la búsqueda.</p></div>
      ) : vista === 'tarjetas' ? (
        <div className="rejilla-insumos">
          {visibles.map((insumo) => {
            const lote = lotePorInsumo[insumo.nombre];
            const unidad = unidadDe(insumo.unidad_medida);
            const urgente = insumo.bajo_stock_minimo || lote?.vencido || lote?.dias_restantes <= 3;
            return (
              <article key={insumo.id} className={urgente ? 'insumo-tarjeta urgente' : 'insumo-tarjeta'}>
                <header>
                  <Inicial texto={insumo.nombre} />
                  <div>
                    <h3>{insumo.nombre}</h3>
                    <span className={insumo.tipo_control === 'LIBRE' ? 'insignia lila' : 'insignia verde'}>{insumo.tipo_control}</span>
                  </div>
                </header>
                <div className="insumo-stock">
                  <b className={insumo.bajo_stock_minimo ? 'texto-rojo' : ''}>{cifra(insumo.stock_actual, 2)}</b> <span>{unidad}</span>
                  <small>mín. {cifra(insumo.stock_minimo, 0)} {unidad}</small>
                </div>
                <BarraNivel actual={insumo.stock_actual} minimo={insumo.stock_minimo} />
                <div className="insumo-estados">
                  {insumo.bajo_stock_minimo && <span className="chip rojo">Bajo el mínimo</span>}
                  {lote && <span className="chip ambar">{vencimiento(lote)}</span>}
                  {!insumo.bajo_stock_minimo && !lote && <span className="chip verde">{insumo.tipo_control === 'LIBRE' ? 'Por conteo' : 'Normal'}</span>}
                  {insumo.tipo_control === 'LIBRE' && insumo.dotacion_cantidad && (
                    <span className="chip gris">Dotación {cifra(insumo.dotacion_cantidad, 0)} {unidad}/{insumo.dotacion_periodo === 'MENSUAL' ? 'mes' : 'semana'}</span>
                  )}
                </div>
                <footer>
                  {veCosto ? <span className="mono">S/ {cifra(insumo.costo_unitario, 2)} /{unidad}</span> : <span />}
                  <div className="fila-acciones">
                    {esAdmin && (
                      <ClasificarInsumo
                        insumo={insumo}
                        token={auth.token}
                        onGuardado={(nuevo) => setInsumos((lista) => lista.map((i) => (i.id === nuevo.id ? nuevo : i)))}
                      />
                    )}
                    <button type="button" className="boton" onClick={() => setKardexDe(insumo)}>Ver kardex</button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="tarjeta sin-relleno">
          <div className="tabla-caja">
            <table className="tabla tabla-panel">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Tipo</th>
                  {veCosto && <th className="num">Costo</th>}
                  <th className="num">Stock</th>
                  <th className="num">Mínimo</th>
                  <th>Vence</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibles.map((insumo) => {
                  const lote = lotePorInsumo[insumo.nombre];
                  const unidad = unidadDe(insumo.unidad_medida);
                  return (
                    <tr key={insumo.id}>
                      <td>
                        <div className="platillo-celda"><Inicial texto={insumo.nombre} tamano={32} />{insumo.nombre}</div>
                      </td>
                      <td className="sin-salto">
                        <span className={insumo.tipo_control === 'LIBRE' ? 'insignia lila' : 'insignia verde'}>{insumo.tipo_control}</span>
                        {esAdmin && (
                          <ClasificarInsumo
                            insumo={insumo}
                            token={auth.token}
                            onGuardado={(nuevo) => setInsumos((lista) => lista.map((i) => (i.id === nuevo.id ? nuevo : i)))}
                          />
                        )}
                      </td>
                      {veCosto && <td className="num">S/ {cifra(insumo.costo_unitario, 2)} /{unidad}</td>}
                      <td className={insumo.bajo_stock_minimo ? 'num texto-rojo' : 'num'}>{cifra(insumo.stock_actual, 2)} {unidad}</td>
                      <td className="num">{cifra(insumo.stock_minimo, 0)} {unidad}</td>
                      <td className={lote?.vencido || lote?.dias_restantes <= 3 ? 'mono texto-ambar fuerte' : 'mono'}>
                        {lote ? diaMes(lote.fecha_vencimiento) : '—'}
                      </td>
                      <td>
                        {insumo.bajo_stock_minimo && <span className="texto-rojo fuerte">Bajo el mínimo</span>}
                        {insumo.bajo_stock_minimo && lote && <br />}
                        {lote && <span className="texto-ambar fuerte">{vencimiento(lote)}</span>}
                        {!insumo.bajo_stock_minimo && !lote && (insumo.tipo_control === 'LIBRE' ? 'Por conteo' : 'Normal')}
                      </td>
                      <td><button type="button" className="enlace-boton" onClick={() => setKardexDe(insumo)}>Kardex</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {kardexDe && <KardexPanel insumo={kardexDe} token={auth.token} onCerrar={() => setKardexDe(null)} />}
    </div>
  );
}

// "16.140" → "16,14": cifras con coma, como el prototipo; los mínimos sin decimales si son enteros
function cifra(valor, decimales) {
  const n = Number(valor);
  const d = decimales === 0 && !Number.isInteger(n) ? 2 : decimales;
  return n.toFixed(d).replace('.', ',');
}

export default Insumos;
