// Desde y hasta de un reporte (días de Perú). Lo usan todas las pestañas que piden un periodo.
function FiltroPeriodo({ periodo, onCambiar, children }) {
  const cambiar = (e) => onCambiar({ ...periodo, [e.target.name]: e.target.value });

  return (
    <div style={styles.fila}>
      <label style={styles.campo}>
        Desde
        <input type="date" name="desde" value={periodo.desde} max={periodo.hasta} onChange={cambiar}
          style={styles.input} />
      </label>
      <label style={styles.campo}>
        Hasta
        <input type="date" name="hasta" value={periodo.hasta} min={periodo.desde} onChange={cambiar}
          style={styles.input} />
      </label>
      {children}
    </div>
  );
}

const styles = {
  fila: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', marginBottom: '16px' },
  campo: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#5f6368' },
  input: { padding: '8px 10px', fontSize: '14px', border: '1px solid #dadce0', borderRadius: '4px' },
};

export default FiltroPeriodo;
