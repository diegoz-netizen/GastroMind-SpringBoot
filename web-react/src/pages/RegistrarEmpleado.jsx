import React, { useState } from 'react';

export const RegistrarEmpleado = () => {
    const [formData, setFormData] = useState({
        nombreCompleto: '',
        correo: '',
        password: '',
        pinAcceso: '',
        rolId: ''
    });
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMensaje({ texto: '', tipo: '' });

        // Obtener el token guardado en la sesión del usuario administrador logueado
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('http://localhost:8080/api/empleados', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    rolId: parseInt(formData.rolId)
                })
            });

            const data = await response.json();

            if (response.status === 201) {
                setMensaje({ texto: `✅ Empleado "${data.nombreCompleto}" registrado con éxito.`, tipo: 'exito' });
                setFormData({ nombreCompleto: '', correo: '', password: '', pinAcceso: '', rolId: '' });
            } else {
                setMensaje({ texto: `❌ Error (${response.status}): ${data.mensaje || 'No se pudo registrar'}`, tipo: 'error' });
            }
        } catch (error) {
            setMensaje({ texto: '❌ Error de conexión con el servidor.', tipo: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '450px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Registrar Nuevo Empleado</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Nombre Completo *</label>
                    <input type="text" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Correo Electrónico *</label>
                    <input type="email" name="correo" value={formData.correo} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Contraseña *</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>PIN de Acceso (4 dígitos) *</label>
                    <input type="password" name="pinAcceso" maxLength="4" value={formData.pinAcceso} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Rol del Empleado *</label>
                    <select name="rolId" value={formData.rolId} onChange={handleChange} required style={{ width: '100%', padding: '8px' }}>
                        <option value="">-- Seleccionar Rol --</option>
                        <option value="2">Cocinero</option>
                        <option value="3">Almacenero</option>
                        <option value="4">Cajero</option>
                    </select>
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px' }}>
                    {loading ? 'Procesando...' : 'Registrar Empleado'}
                </button>
            </form>
            {mensaje.texto && (
                <div style={{ marginTop: '1rem', padding: '10px', borderRadius: '4px', backgroundColor: mensaje.tipo === 'exito' ? '#d4edda' : '#f8d7da', color: mensaje.tipo === 'exito' ? '#155724' : '#721c24' }}>
                    {mensaje.texto}
                </div>
            )}
        </div>
    );
};

export default RegistrarEmpleado;