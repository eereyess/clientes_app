import { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [allUsuarios, setAllUsuarios] = useState([]); // for visibility assignment
    const [roles, setRoles] = useState([]);
    const [estados, setEstados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [form, setForm] = useState({
        nombre: '', email: '', password: '', id_rol: 3, activo: true,
        visibilidad: 'propios', usuarios_visibles: [],
        recibe_notificaciones: false, estados_notificacion: []
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get('/usuarios'),
            api.get('/parametricas/roles'),
            api.get('/parametricas/estados')
        ]).then(([usRes, rolesRes, estadosRes]) => {
            setUsuarios(usRes.data);
            setAllUsuarios(usRes.data);
            setRoles(rolesRes.data);
            setEstados(estadosRes.data);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const openNew = () => {
        setEditUser(null);
        setForm({ nombre: '', email: '', password: '', id_rol: 3, activo: true, visibilidad: 'propios', usuarios_visibles: [], recibe_notificaciones: false, estados_notificacion: [] });
        setShowModal(true);
    };

    const openEdit = (user) => {
        setEditUser(user);
        setForm({
            nombre: user.nombre, email: user.email, password: '', id_rol: user.id_rol, activo: user.activo !== false,
            visibilidad: user.visibilidad || 'todos',
            usuarios_visibles: user.usuarios_visibles || [],
            recibe_notificaciones: !!user.recibe_notificaciones,
            estados_notificacion: user.estados_notificacion || []
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.nombre || !form.email) return;
        setSaving(true);
        try {
            if (editUser) {
                const payload = { ...form };
                if (!payload.password) delete payload.password;
                await api.put(`/usuarios/${editUser.id_usuario}`, payload);
            } else {
                if (!form.password) { setSaving(false); return; }
                await api.post('/usuarios', form);
            }
            const res = await api.get('/usuarios');
            setUsuarios(res.data);
            setAllUsuarios(res.data);
            setShowModal(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Error');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (user) => {
        if (user.activo) {
            await api.delete(`/usuarios/${user.id_usuario}`);
        } else {
            await api.put(`/usuarios/${user.id_usuario}`, { activo: true });
        }
        const res = await api.get('/usuarios');
        setUsuarios(res.data);
    };



    const toggleEstadoNotificacion = (estadoId) => {
        const en = form.estados_notificacion || [];
        if (en.includes(estadoId)) {
            setForm({ ...form, estados_notificacion: en.filter(e => e !== estadoId) });
        } else {
            setForm({ ...form, estados_notificacion: [...en, estadoId] });
        }
    };

    const toggleUsuarioVisible = (userId) => {
        const uv = form.usuarios_visibles || [];
        if (uv.includes(userId)) {
            setForm({ ...form, usuarios_visibles: uv.filter(u => u !== userId) });
        } else {
            setForm({ ...form, usuarios_visibles: [...uv, userId] });
        }
    };

    const visibilidadLabel = (v) => {
        if (v === 'todos') return '🌐 Todos';
        if (v === 'propios') return '👤 Solo propios';
        if (v === 'especificos') return '👥 Específicos';
        return v;
    };

    if (loading) return <div className="page-container"><div className="empty-state"><div className="empty-state-icon">⏳</div><h3>Cargando...</h3></div></div>;

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1>Usuarios</h1>
                    <p className="page-header-subtitle">{usuarios.length} usuarios registrados</p>
                </div>
                <button className="btn btn-primary" onClick={openNew}>➕ Nuevo Usuario</button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Visibilidad</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => (
                                <tr key={u.id_usuario}>
                                    <td><strong>{u.nombre}</strong></td>
                                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{u.email}</td>
                                    <td><span className="badge badge-blue">{u.rol}</span></td>
                                    <td><span style={{ fontSize: 12 }}>{visibilidadLabel(u.visibilidad)}</span></td>
                                    <td>
                                        <span className={`badge ${u.activo ? 'badge-green' : 'badge-red'}`}>
                                            <span className="badge-dot"></span>{u.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="btn-group">
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>✏️</button>
                                            <button className="btn btn-sm" onClick={() => toggleActive(u)}
                                                style={{ background: u.activo ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: u.activo ? '#EF4444' : '#10B981', border: 'none' }}>
                                                {u.activo ? '🚫' : '✅'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? '⏳...' : '💾 Guardar'}
                        </button>
                    </>
                }
            >
                {/* Basic fields */}
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Nombre <span className="required">*</span></label>
                        <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email <span className="required">*</span></label>
                        <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Contraseña {!editUser && <span className="required">*</span>}</label>
                        <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editUser ? 'Dejar vacío para no cambiar' : ''} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Rol</label>
                        <select className="form-select" value={form.id_rol} onChange={e => setForm({ ...form, id_rol: parseInt(e.target.value) })}>
                            {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
                        </select>
                    </div>
                </div>

                {/* User Status */}
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} style={{ width: 16, height: 16 }} />
                        Usuario Activo en el Sistema
                    </label>
                </div>

                {/* Visibility */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 8 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 14 }}>👁️ Visibilidad de Casos</label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {['todos', 'propios', 'especificos'].map(v => (
                            <button type="button" key={v} className={`btn btn-sm ${form.visibilidad === v ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setForm({ ...form, visibilidad: v, usuarios_visibles: v === 'especificos' ? form.usuarios_visibles : [] })}>
                                {visibilidadLabel(v)}
                            </button>
                        ))}
                    </div>
                    <p className="form-help" style={{ marginTop: 6 }}>
                        {form.visibilidad === 'todos' && 'El usuario podrá ver todos los tickets del sistema.'}
                        {form.visibilidad === 'propios' && 'El usuario solo verá los tickets que él haya creado.'}
                        {form.visibilidad === 'especificos' && 'El usuario verá sus propios tickets más los de los usuarios seleccionados abajo.'}
                    </p>

                    {form.visibilidad === 'especificos' && (
                        <div style={{ marginTop: 8 }}>
                            <label className="form-label" style={{ fontSize: 12 }}>Seleccione los usuarios cuyos tickets podrá ver:</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                {allUsuarios.filter(u => u.id_usuario !== (editUser?.id_usuario || 0)).map(u => (
                                    <button type="button" key={u.id_usuario}
                                        className={`btn btn-sm ${(form.usuarios_visibles || []).includes(u.id_usuario) ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => toggleUsuarioVisible(u.id_usuario)}>
                                        {(form.usuarios_visibles || []).includes(u.id_usuario) ? '✓ ' : ''}{u.nombre}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Notificaciones Email */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 16 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={form.recibe_notificaciones} onChange={e => setForm({ ...form, recibe_notificaciones: e.target.checked })} style={{ width: 16, height: 16 }} />
                        📧 Recibir Notificaciones (Mail y Mensajes)
                    </label>
                    <p className="form-help">Si está activo, recibirá un email cuando un usuario de su grupo cambie un ticket a alguno de estos estados:</p>

                    {form.recibe_notificaciones && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {(estados || []).map(e => (
                                <button type="button" key={'notif_' + e.id_estado}
                                    className={`btn btn-sm`}
                                    style={{
                                        background: (form.estados_notificacion || []).includes(e.id_estado) ? (e.color || '#666') + '22' : 'var(--color-bg)',
                                        color: (form.estados_notificacion || []).includes(e.id_estado) ? (e.color || '#666') : 'var(--color-text-secondary)',
                                        border: (form.estados_notificacion || []).includes(e.id_estado) ? `2px solid ${e.color || '#666'}` : '1px solid var(--color-border)',
                                        fontWeight: (form.estados_notificacion || []).includes(e.id_estado) ? 700 : 400
                                    }}
                                    onClick={() => toggleEstadoNotificacion(e.id_estado)}>
                                    {(form.estados_notificacion || []).includes(e.id_estado) ? '✓ ' : ''}{e.nombre}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
