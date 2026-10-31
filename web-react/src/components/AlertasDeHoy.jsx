import { useEffect, useState } from 'react';
import axios from 'axios';
import { DJANGO_URL } from '../config/api';
import { ALERTAS_URL, cantidad, cuandoVence, diaMes } from '../config/alertas';

const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// Tarjeta "Alertas de hoy" del Panel, según el prototipo: rojo = bajo el mínimo, ámbar = por vencer
function AlertasDeHoy({ token }) {
  const [alertas, setAlertas] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await axios.get(ALERTAS_URL, conToken(token));
        setAlertas(response.data);
      } catch (err) {
        setError(
          err.response
            ? err.response.data?.mensaje || 'No se pudieron cargar las alertas.'
            : 'No se pudo conectar con el servidor de Django. Verifica que esté corriendo en ' + DJANGO_URL
        );
      }
    };
    cargar();
  }, [token]);

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Alertas de hoy</h2>

      {error && <p style={styles.error}>{error}</p>}
      {!error && !alertas && <p style={styles.empty}>Cargando alertas...</p>}
      {alertas && alertas.total === 0 && <p style={styles.empty}>Sin alertas por hoy.</p>}

      {alertas?.stock_minimo.map((insumo) => (
        <div key={`stock-${insumo.id}`} style={{ ...styles.alerta, ...styles.alertaStock }}>
          <span style={{ ...styles.barra, backgroundColor: '#c5221f' }} />
          <div>
            <p style={styles.alertaTitulo}>{insumo.nombre} bajo el mínimo</p>
            <p style={styles.alertaDetalle}>
              Quedan {cantidad(insumo.stock_actual)} {insumo.unidad_medida} · mínimo{' '}
              {cantidad(insumo.stock_minimo)} {insumo.unidad_medida}
            </p>
          </div>
        </div>
      ))}

      {alertas?.vencimiento.map((lote) => (
        <div key={`lote-${lote.id}`} style={{ ...styles.alerta, ...styles.alertaVence }}>
          <span style={{ ...styles.barra, backgroundColor: '#e37400' }} />
          <div>
            <p style={styles.alertaTitulo}>
              {lote.insumo} {lote.vencido ? 'venció' : 'vence'} el {diaMes(lote.fecha_vencimiento)}
            </p>
            <p style={styles.alertaDetalle}>
              Lote {lote.lote ? `${lote.lote} ` : ''}de {cantidad(lote.cantidad_recibida)} {lote.unidad_medida} ·{' '}
              {cuandoVence(lote)} · {lote.proveedor}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    marginTop: '24px',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #dadce0',
    backgroundColor: '#ffffff',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    color: '#202124',
  },
  empty: {
    margin: 0,
    fontSize: '14px',
    color: '#5f6368',
  },
  error: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: '4px',
    backgroundColor: '#fce8e6',
    color: '#c5221f',
    fontSize: '14px',
  },
  alerta: {
    display: 'flex',
    gap: '12px',
    alignItems: 'stretch',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '10px',
  },
  alertaStock: {
    backgroundColor: '#fce8e6',
  },
  alertaVence: {
    backgroundColor: '#fef7e0',
  },
  barra: {
    width: '4px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  alertaTitulo: {
    margin: '0 0 4px 0',
    fontSize: '15px',
    fontWeight: '600',
    color: '#202124',
  },
  alertaDetalle: {
    margin: 0,
    fontSize: '13px',
    color: '#3c4043',
  },
};

export default AlertasDeHoy;
