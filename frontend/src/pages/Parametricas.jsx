import { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';

const tableConfig = {
    tipos_solicitud: { label: 'Tipos de Solicitud', idField: 'id_tipo', fields: ['nombre', 'descripcion'] },
    estados: { label: 'Estados', idField: 'id_estado', fields: ['nombre', 'color', 'orden'] },
    roles: { label: 'Roles', idField: 'id_rol', fields: ['nombre', 'descripcion'] }
};

const rutasSistema = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/tickets', label: 'Casos', icon: '🎫' },
    { path: '/tickets/nuevo', label: 'Nuevo Caso', icon: '➕' },
    { path: '/mensajes', label: 'Mensajes', icon: '✉️' },
    { path: '/estadisticas', label: 'Estadísticas', icon: '📈' },
    { path: '/usuarios', label: 'Usuarios', icon: '👥' },
    { path: '/parametricas', label: 'Paramétricas', icon: '⚙️' },
    { path: '/configuracion', label: 'Configuración', icon: '🎨' }
];

export default function Parametricas() {
    const [activeTable, setActiveTable] = useState('tipos_solicitud');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({});
    const [estadosList, setEstadosList] = useState([]);

    useEffect(() => {
        api.get('/parametricas/estados/all').then(res => setEstadosList(res.data)).catch(console.error);
    }, []);

    useEffect(() => { loadData(); }, [activeTable]);

    const loadData = () => {
        setLoading(true);
        api.get(`/parametricas/${activeTable}/all`)
            .then(res => setData(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const config = tableConfig[activeTable];

    const openNew = () => {
        setEditItem(null);
        const initial = {};
        config.fields.forEach(f => initial[f] = '');
        if (activeTable === 'roles') {
            initial.accesos_menu = [];
            initial.visibilidad_estados_tipo = 'todos';
            initial.estados_permitidos = [];
        }
        setForm(initial);
        setShowModal(true);
    };

    const openEdit = (item) => {
        setEditItem(item);
        const initial = {};
        config.fields.forEach(f => initial[f] = item[f] || '');
        if (activeTable === 'roles') {
            initial.accesos_menu = item.accesos_menu || [];
            initial.visibilidad_estados_tipo = item.visibilidad_estados_tipo || 'todos';
            initial.estados_permitidos = item.estados_permitidos || [];
        }
        setForm(initial);
        setShowModal(true);
    };

    const toggleMenuAccess = (path) => {
        const accesos = form.accesos_menu || [];
        if (accesos.includes(path)) setForm({ ...form, accesos_menu: accesos.filter(p => p !== path) });
        else setForm({ ...form, accesos_menu: [...accesos, path] });
    };

    const handleSave = async () => {
        try {
            if (editItem) {
                await api.put(`/parametricas/${activeTable}/${editItem[config.idField]}`, form);
            } else {
                await api.post(`/parametricas/${activeTable}`, form);
            }
            loadData();
            setShowModal(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Error');
        }
    };

    const handleDelete = async (item) => {
        if (!confirm('¿Desactivar este registro?')) return;
        await api.delete(`/parametricas/${activeTable}/${item[config.idField]}`);
        loadData();
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1>Tablas Paramétricas</h1>
                    <p className="page-header-subtitle">Administración de tablas configurables</p>
                </div>
                <button className="btn btn-primary" onClick={openNew}>➕ Nuevo Registro</button>
            </div>

            <div className="filters-bar">
                {Object.entries(tableConfig).map(([key, cfg]) => (
                    <button
                        key={key}
                        className={`btn ${activeTable === key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setActiveTable(key)}
                    >
                        {cfg.label}
                    </button>
                ))}
            </div>

            <div className="card">
                {loading ? (
                    <div className="empty-state"><div className="empty-state-icon">⏳</div><h3>Cargando...</h3></div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    {config.fields.map(f => <th key={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</th>)}
                                    <th>Activo</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(item => (
                                    <tr key={item[config.idField]}>
                                        <td>{item[config.idField]}</td>
                                        {config.fields.map(f => (
                                            <td key={f}>
                                                {f === 'color' ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ width: 20, height: 20, borderRadius: 4, background: item[f] || '#ccc' }}></div>
                                                        {item[f]}
                                                    </div>
                                                ) : (item[f] ?? '—')}
                                            </td>
                                        ))}
                                        <td>
                                            <span className={`badge ${item.activo !== false ? 'badge-green' : 'badge-red'}`}>
                                                <span className="badge-dot"></span>{item.activo !== false ? 'Sí' : 'No'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="param-table-actions">
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>✏️</button>
                                                {item.activo !== false && (
                                                    <button className="btn btn-sm" onClick={() => handleDelete(item)}
                                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none' }}>🗑️</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={`${editItem ? 'Editar' : 'Nuevo'} - ${config.label}`}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSave}>💾 Guardar</button>
                    </>
                }
            >
                {config.fields.map(f => (
                    <div className="form-group" key={f}>
                        <label className="form-label">{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                        {f === 'color' ? (
                            <div className="color-preview">
                                <input type="color" value={form[f] || '#000000'} onChange={e => setForm({ ...form, [f]: e.target.value })} className="color-swatch" />
                                <input className="form-input color-input-hex" value={form[f] || ''} onChange={e => setForm({ ...form, [f]: e.target.value })} placeholder="#000000" />
                            </div>
                        ) : f === 'orden' ? (
                            <input type="number" className="form-input" value={form[f] || ''} onChange={e => setForm({ ...form, [f]: parseInt(e.target.value) || 0 })} />
                        ) : (
                            <input className="form-input" value={form[f] || ''} onChange={e => setForm({ ...form, [f]: e.target.value })} />
                        )}
                    </div>
                ))}

                {activeTable === 'roles' && (
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 16 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: 14 }}>🔑 Accesos del Menú</label>
                        <p className="form-help">Seleccione las secciones a las que los usuarios con este rol tendrán acceso en la barra lateral.</p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginTop: 12 }}>
                            {rutasSistema.map(ruta => (
                                <label key={ruta.path} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', background: 'var(--color-bg)', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                                    <input
                                        type="checkbox"
                                        checked={(form.accesos_menu || []).includes(ruta.path)}
                                        onChange={() => toggleMenuAccess(ruta.path)}
                                    />
                                    <span>{ruta.icon} {ruta.label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Allowed states for this role */}
                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 16 }}>
                            <label className="form-label" style={{ fontWeight: 700, fontSize: 14 }}>🔄 Estados Permitidos</label>
                            <p className="form-help">Seleccione qué estados pueden aplicar los usuarios con este rol al modificar un ticket.</p>

                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                {['todos', 'especificos'].map(v => (
                                    <button type="button" key={v} className={`btn btn-sm ${form.visibilidad_estados_tipo === v ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setForm({ ...form, visibilidad_estados_tipo: v })}>
                                        {v === 'todos' ? '🌐 Todos los Estados' : '🎯 Estados Específicos'}
                                    </button>
                                ))}
                            </div>

                            {form.visibilidad_estados_tipo === 'especificos' && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                                    {estadosList.filter(e => e.activo).map(e => (
                                        <button type="button" key={e.id_estado}
                                            className="btn btn-sm"
                                            style={{
                                                background: (form.estados_permitidos || []).includes(e.id_estado) ? e.color + '22' : 'var(--color-bg)',
                                                color: (form.estados_permitidos || []).includes(e.id_estado) ? e.color : 'var(--color-text-secondary)',
                                                border: (form.estados_permitidos || []).includes(e.id_estado) ? `2px solid ${e.color}` : '1px solid var(--color-border)',
                                                fontWeight: (form.estados_permitidos || []).includes(e.id_estado) ? 700 : 400
                                            }}
                                            onClick={() => {
                                                const ep = form.estados_permitidos || [];
                                                if (ep.includes(e.id_estado)) {
                                                    setForm({ ...form, estados_permitidos: ep.filter(id => id !== e.id_estado) });
                                                } else {
                                                    setForm({ ...form, estados_permitidos: [...ep, e.id_estado] });
                                                }
                                            }}>
                                            {(form.estados_permitidos || []).includes(e.id_estado) ? '✓ ' : ''}{e.nombre}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
