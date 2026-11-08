import { useState } from 'react';
import { descargarExcel, mensajeDeReporte } from '../../config/reportes';

// HU-24 (CA-24): descarga el reporte en Excel con los filtros que se le pasan (los mismos de la pantalla)
function BotonExcel({ token, tipo, params, texto = 'Descargar Excel' }) {
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState('');

  const bajar = async () => {
    setBajando(true);
    setError('');
    try {
      await descargarExcel(token, tipo, params);
    } catch (err) {
      setError(mensajeDeReporte(err));
    } finally {
      setBajando(false);
    }
  };

  return (
    <div style={styles.caja}>
      <button type="button" onClick={bajar} disabled={bajando}
        style={{ ...styles.boton, ...(bajando ? styles.deshabilitado : {}) }}>
        {bajando ? 'Preparando...' : texto}
      </button>
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}

const styles = {
  caja: { display: 'flex', flexDirection: 'column', gap: '4px' },
  boton: {
    padding: '8px 14px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#137333',
    border: '1px solid #137333',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deshabilitado: { opacity: 0.6, cursor: 'not-allowed' },
  error: { fontSize: '12px', color: '#d93025', maxWidth: '260px' },
};

export default BotonExcel;
