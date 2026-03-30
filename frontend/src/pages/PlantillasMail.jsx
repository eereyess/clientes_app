import { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';

export default function PlantillasMail() {
    const [plantillas, setPlantillas] = useState([]);
    const [estados, setEstados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [form, setForm] = useState({ id_plantilla: null, id_estado: '', asunto: '', cuerpo_html: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get('/plantillas'),
            api.get('/parametricas/estados')
        ]).then(([pRes, eRes]) => {
            setPlantillas(pRes.data);
            setEstados(eRes.data);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const defaultHtmlTemplate = `<h2 style="color: #1e40af; margin-bottom: 16px;">Notificación de Caso #{{ticket}}</h2>
<p>Estimado/a <strong>{{nombre}}</strong>,</p>
<p>Le informamos que el ticket <strong>#{{ticket}}</strong> ha cambiado al estado: <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-weight: 600;">{{estado}}</span></p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
  <tr style="background: #f8fafc;">
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; width: 35%; color: #475569;">Agencia</td>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0;">{{agencia}}</td>
  </tr>
  <tr>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Tipo de File</td>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0;">{{tipo_file}}</td>
  </tr>
  <tr style="background: #f8fafc;">
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">N° File</td>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0;">{{numero_file}}</td>
  </tr>
  <tr>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Operador</td>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0;">{{operador}}</td>
  </tr>
  <tr style="background: #f8fafc;">
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Agente</td>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0;">{{agente}}</td>
  </tr>
  <tr>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Pasajero</td>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0;">{{pasajero}}</td>
  </tr>
  <tr style="background: #f8fafc;">
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Destino</td>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0;">{{destino}}</td>
  </tr>
  <tr>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Proveedor</td>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0;">{{proveedor}}</td>
  </tr>
  <tr style="background: #f8fafc;">
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Moneda</td>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0;">{{moneda}}</td>
  </tr>
  <tr>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Monto</td>
    <td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">{{monto}}</td>
  </tr>
</table>

<p style="color: #64748b; font-size: 13px; margin-top: 16px;">Para más detalles, ingrese al sistema de gestión de tickets.</p>`;

    const openNew = () => {
        setForm({ id_plantilla: null, id_estado: estados[0]?.id_estado || '', asunto: 'Caso #{{ticket}} - Cambio de Estado: {{estado}}', cuerpo_html: defaultHtmlTemplate });
        setEditMode(false);
        setShowModal(true);
    };

    const openEdit = (p) => {
        setForm(p);
        setEditMode(true);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.id_estado || !form.asunto) return;
        setSaving(true);
        try {
            if (editMode) {
                await api.put(`/plantillas/${form.id_plantilla}`, form);
            } else {
                await api.post('/plantillas', form);
            }
            const res = await api.get('/plantillas');
            setPlantillas(res.data);
            setShowModal(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Error al guardar plantilla');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar plantilla?')) return;
        await api.delete(`/plantillas/${id}`);
        setPlantillas(plantillas.filter(p => p.id_plantilla !== id));
    };

    const getEstadoNombre = (id) => estados.find(e => e.id_estado === id)?.nombre || id;

    if (loading) return <div className="page-container"><div className="empty-state"><div className="empty-state-icon">⏳</div><h3>Cargando...</h3></div></div>;

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1>Configuración de Mail</h1>
                    <p className="page-header-subtitle">Plantillas de correo automático por estado</p>
                </div>
                <button className="btn btn-primary" onClick={openNew}>➕ Nueva Plantilla</button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="premium-ticket-grid">
                        <thead>
                            <tr>
                                <th>Estado Gatillador</th>
                                <th>Asunto</th>
                                <th>Vista Previa</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plantillas.map(p => (
                                <tr key={p.id_plantilla}>
                                    <td><span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>{getEstadoNombre(p.id_estado)}</span></td>
                                    <td><strong>{p.asunto}</strong></td>
                                    <td>
                                        {p.cuerpo_html ? (
                                            <div style={{
                                                border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden',
                                                maxHeight: 120, maxWidth: 320, background: '#fff'
                                            }}>
                                                <iframe
                                                    srcDoc={p.cuerpo_html}
                                                    sandbox=""
                                                    style={{ width: '100%', height: 120, border: 'none', pointerEvents: 'none' }}
                                                    title="Preview"
                                                />
                                            </div>
                                        ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>Sin contenido</span>}
                                    </td>
                                    <td>
                                        <div className="btn-group">
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Editar</button>
                                            <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none' }} onClick={() => handleDelete(p.id_plantilla)}>Eliminar</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {plantillas.length === 0 && (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24, color: '#666' }}>No hay plantillas configuradas</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editMode ? 'Editar Plantilla' : 'Nueva Plantilla'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '⏳...' : '💾 Guardar'}</button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Estado que gatilla el correo</label>
                    <select className="form-select" value={form.id_estado} onChange={e => setForm({ ...form, id_estado: parseInt(e.target.value) })}>
                        <option value="">-- Seleccionar Estado --</option>
                        {estados.map(e => <option key={e.id_estado} value={e.id_estado}>{e.nombre}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Asunto del Correo <span className="required">*</span></label>
                    <input className="form-input" value={form.asunto} onChange={e => setForm({ ...form, asunto: e.target.value })} />
                </div>

                <div className="form-group">
                    <label className="form-label">Cuerpo del Correo (HTML)</label>
                    <textarea
                        className="form-textarea"
                        rows={6}
                        value={form.cuerpo_html}
                        onChange={e => setForm({ ...form, cuerpo_html: e.target.value })}
                        placeholder="<p>Hola {{nombre}}, tu ticket {{ticket}} ha pasado al estado: {{estado}}.</p>"
                    />
                    <div className="form-help" style={{ marginTop: 8, lineHeight: '1.8' }}>
                        <strong>Variables dinámicas soportadas:</strong> <br />
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{ticket}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{nombre}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{estado}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{agencia}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{tipo_file}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{numero_file}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{operador}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{agente}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{pasajero}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{destino}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{moneda}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{monto}}`}</code>
                        <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{`{{proveedor}}`}</code>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
