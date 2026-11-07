import { useState } from 'react';

const VACIA = { numero: '', capacidad: '4', zona: 'Salón' };

const aFormulario = (mesa) =>
  mesa ? { numero: String(mesa.numero), capacidad: String(mesa.capacidad), zona: mesa.zona } : VACIA;

// HU-26: el mismo formulario sirve para registrar una mesa (mesa = null) o editarla.
// Quien lo usa le cambia la key para reiniciarlo (otra mesa o después de registrar).
function MesaFormulario({ mesa, guardando, erroresCampo, onGuardar, onCancelar }) {
  const [valores, setValores] = useState(() => aFormulario(mesa));

  const cambiar = (e) => setValores({ ...valores, [e.target.name]: e.target.value });

  const enviar = (e) => {
    e.preventDefault();
    onGuardar({
      numero: valores.numero === '' ? null : Number(valores.numero),
      capacidad: valores.capacidad === '' ? null : Number(valores.capacidad),
      zona: valores.zona,
    });
  };

  return (
    <form onSubmit={enviar} style={styles.form} noValidate>
      <h2 style={styles.titulo}>{mesa ? `Editar la mesa ${mesa.numero}` : 'Nueva mesa'}</h2>
      {mesa?.estado === 'OCUPADA' && (
        <p style={styles.aviso}>Está ocupada: puedes cambiar su capacidad y su zona, pero no su número.</p>
      )}
      <div style={styles.fila}>
        <Campo etiqueta="Número" error={erroresCampo.numero}>
          <input name="numero" type="number" min="1" value={valores.numero} onChange={cambiar}
                 style={styles.input} />
        </Campo>
        <Campo etiqueta="Capacidad (personas)" error={erroresCampo.capacidad}>
          <input name="capacidad" type="number" min="1" max="30" value={valores.capacidad} onChange={cambiar}
                 style={styles.input} />
        </Campo>
        <Campo etiqueta="Zona" error={erroresCampo.zona}>
          <input name="zona" type="text" maxLength="30" value={valores.zona} onChange={cambiar}
                 placeholder="Salón, Terraza, Barra..." style={styles.input} />
        </Campo>
      </div>
      <div style={styles.botones}>
        <button type="submit" disabled={guardando}
                style={{ ...styles.guardar, ...(guardando ? styles.deshabilitado : {}) }}>
          {guardando ? 'Guardando...' : mesa ? 'Guardar cambios' : 'Registrar mesa'}
        </button>
        {mesa && (
          <button type="button" onClick={onCancelar} style={styles.cancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function Campo({ etiqueta, error, children }) {
  return (
    <label style={styles.campo}>
      <span style={styles.etiqueta}>{etiqueta}</span>
      {children}
      {error && <span style={styles.errorCampo}>{error}</span>}
    </label>
  );
}

const styles = {
  form: {
    marginBottom: '24px',
    padding: '16px',
    border: '1px solid #dadce0',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
  },
  titulo: { margin: '0 0 12px 0', fontSize: '16px', color: '#3c4043' },
  aviso: { margin: '0 0 12px 0', fontSize: '13px', color: '#b06000' },
  fila: { display: 'flex', flexWrap: 'wrap', gap: '12px' },
  campo: { display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 160px' },
  etiqueta: { fontSize: '13px', color: '#5f6368' },
  input: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #dadce0',
    borderRadius: '4px',
  },
  errorCampo: { fontSize: '12px', color: '#d93025' },
  botones: { display: 'flex', gap: '8px', marginTop: '12px' },
  guardar: {
    padding: '8px 14px',
    fontSize: '14px',
    backgroundColor: '#1a73e8',
    color: '#ffffff',
    border: '1px solid #1a73e8',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelar: {
    padding: '8px 14px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#5f6368',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deshabilitado: { opacity: 0.6, cursor: 'not-allowed' },
};

export default MesaFormulario;
