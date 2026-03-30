import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/Modal';
import EditarValores from '../components/EditarValores';
import FileUpload from '../components/FileUpload';
import { formatDate } from './TicketLista';

export default function TicketDetalle() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionToConfirm, setActionToConfirm] = useState(null); // Custom confirm state

    // Edit basic info modal
    const [showEditTicketModal, setShowEditTicketModal] = useState(false);
    const [editForm, setEditForm] = useState({});

    // Edit mode for Valores Financials
    const [editMode, setEditMode] = useState(false);

    const [showEstadoModal, setShowEstadoModal] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [estadoDesc, setEstadoDesc] = useState('');
    const [estadoArchivos, setEstadoArchivos] = useState([]);
    const [changingState, setChangingState] = useState(false);

    // Annul modal
    const [showAnularModal, setShowAnularModal] = useState(false);
    const [anularDesc, setAnularDesc] = useState('');
    const [anulando, setAnulando] = useState(false);

    const [saving, setSaving] = useState(false);

    useEffect(() => { loadTicket(); }, [id]);

    const loadTicket = () => {
        setLoading(true);
        api.get(`/tickets/${id}`)
            .then(async (res) => {
                let fetchedProviders = [];
                try {
                    const orisRes = await api.get(`/oris/file/${res.data.num_file}`);
                    fetchedProviders = orisRes.data.proveedores || [];
                } catch (e) { console.error('No oris providers found', e); }

                const fullTicket = { ...res.data, proveedores: fetchedProviders };
                setTicket(fullTicket);
                setEditForm({
                    id_tipo_solicitud: fullTicket.id_tipo_solicitud,
                    descripcion: fullTicket.descripcion,
                    proveedor_id: fullTicket.proveedor_id || '',
                    proveedor_nombre: fullTicket.proveedor_nombre || '',
                    moneda: fullTicket.moneda || 'CLP',
                    monto: fullTicket.monto || '',
                    pasajero: fullTicket.pasajero || '',
                    sernac: !!fullTicket.sernac,
                    archivos: []
                });
            })
            .catch((err) => {
                console.error('Error al cargar caso:', err);
                alert('No se pudo cargar el caso. ' + (err.response?.data?.error || err.message));
                navigate('/tickets');
            })
            .finally(() => setLoading(false));
    };

    const confirmAction = (action, props) => {
        setActionToConfirm({ action, ...props });
    };

    const handleConfirmYes = () => {
        if (!actionToConfirm) return;
        const { action } = actionToConfirm;
        setActionToConfirm(null);
        if (action === 'save_edit') executeSaveEdit();
        else if (action === 'cambiar_estado') executeCambiarEstado();
        else if (action === 'anular') executeAnular();
    };

    const handleSaveEdit = () => {
        confirmAction('save_edit', {
            title: 'Confirmar Guardado',
            message: '¿Está seguro de que desea guardar los cambios en la información de este caso?'
        });
    };

    const executeSaveEdit = async () => {
        setSaving(true);
        try {
            const formData = new FormData();
            Object.keys(editForm).forEach(key => {
                if (key !== 'archivos') formData.append(key, editForm[key]);
            });
            if (editForm.archivos) {
                Array.from(editForm.archivos).forEach(file => formData.append('archivos', file));
            }

            await api.put(`/tickets/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowEditTicketModal(false);
            loadTicket();
        } catch (err) {
            alert(err.response?.data?.error || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleCambiarEstado = () => {
        if (!nuevoEstado || !estadoDesc.trim()) return;
        confirmAction('cambiar_estado', {
            title: 'Confirmar Cambio de Estado',
            message: '¿Confirma el cambio de estado del caso? Se generarán correos/mensajes automáticamente.'
        });
    };

    const executeCambiarEstado = async () => {
        setChangingState(true);
        try {
            const formData = new FormData();
            formData.append('id_estado', nuevoEstado);
            formData.append('descripcion', estadoDesc);

            Array.from(estadoArchivos).forEach(file => {
                formData.append('archivos', file);
            });

            await api.put(`/tickets/${id}/estado`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowEstadoModal(false);
            setNuevoEstado('');
            setEstadoDesc('');
            setEstadoArchivos([]);
            loadTicket();
        } catch (err) {
            alert(err.response?.data?.error || 'Error al cambiar estado');
        } finally {
            setChangingState(false);
        }
    };

    const handleAnular = () => {
        if (!anularDesc.trim()) return;
        confirmAction('anular', {
            title: '¡ALERTA CRÍTICA!',
            message: '¿Está absolutamente seguro de ANULAR este caso? Esta acción NO se puede deshacer.',
            isCritical: true
        });
    };

    const executeAnular = async () => {
        setAnulando(true);
        try {
            await api.put(`/tickets/${id}/anular`, { descripcion: anularDesc });
            setShowAnularModal(false);
            setAnularDesc('');
            loadTicket();
        } catch (err) {
            alert(err.response?.data?.error || 'Error al anular');
        } finally {
            setAnulando(false);
        }
    };

    if (loading) return <div className="page-container"><div className="empty-state"><div className="empty-state-icon">⏳</div><h3>Cargando...</h3></div></div>;
    if (!ticket) return null;

    const isAnulado = ticket.anulado;
    const isCerradoIncidencia = ticket.estado_nombre?.toLowerCase() === 'cerrado incidencia';
    const isFinalizado = isAnulado || isCerradoIncidencia || [4, 6, 7].includes(ticket.id_estado);
    const isProviderEditDisabled = isAnulado || isCerradoIncidencia || [3, 4, 6, 7].includes(ticket.id_estado);

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {ticket.tipof && <span className="badge badge-blue" style={{ fontSize: 13 }}>{ticket.tipof}</span>}
                        {ticket.sernac && <span className="badge" style={{ fontSize: 13, background: '#DE3C3C22', color: '#DE3C3C', border: '1px solid #DE3C3C' }}>🚨 SERNAC</span>}
                        {ticket.numero_ticket}
                        {isAnulado && <span className="badge badge-red" style={{ fontSize: 13 }}>ANULADO</span>}
                    </h1>
                    <p className="page-header-subtitle">
                        File #{ticket.num_file} — {ticket.pasajero || ticket.agencia} {ticket.agente ? `(Agente: ${ticket.agente})` : ''}
                    </p>
                </div>
                <div className="btn-group">
                    {!isFinalizado && !editMode && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowEditTicketModal(true)}>📝 Editar Info</button>
                            <button className="btn btn-secondary" onClick={() => setEditMode(true)}>💰 Editar Valores</button>
                            <button className="btn btn-primary" onClick={() => setShowEstadoModal(true)}>🔄 Cambiar Estado</button>
                            <button className="btn" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none' }} onClick={() => setShowAnularModal(true)}>🚫 Anular</button>
                        </>
                    )}
                    {editMode && (
                        <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancelar Edición de Valores</button>
                    )}
                    <button className="btn btn-secondary" onClick={() => navigate('/tickets')}>← Volver</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                {/* Main info */}
                <div>
                    {!editMode ? (
                        <>
                            <div className="card">
                                <div className="card-header">
                                    <h2>📋 Información del Caso</h2>
                                    <span className="badge" style={{ background: ticket.estado_color + '22', color: ticket.estado_color, fontWeight: 700 }}>
                                        <span className="badge-dot" style={{ background: ticket.estado_color }}></span>
                                        {ticket.estado_nombre}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <div className="form-row">
                                        <div className="detail-field">
                                            <div className="detail-label">Pasajero</div>
                                            <div className="detail-value" style={{ fontWeight: 700 }}>{ticket.pasajero || '—'}</div>
                                        </div>
                                        <div className="detail-field">
                                            <div className="detail-label">Agencia</div>
                                            <div className="detail-value">
                                                {ticket.agencia || '—'}
                                                {ticket.agente && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Agente: {ticket.agente}</div>}
                                            </div>
                                        </div>
                                        <div className="detail-field">
                                            <div className="detail-label">Destino</div>
                                            <div className="detail-value">{ticket.destino || '—'}</div>
                                        </div>
                                        <div className="detail-field">
                                            <div className="detail-label">Fecha de Viaje</div>
                                            <div className="detail-value">{ticket.fecha_viaje ? new Date(ticket.fecha_viaje).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : '—'}</div>
                                        </div>
                                    </div>

                                    <div className="form-row" style={{ marginTop: 16 }}>
                                        <div className="detail-field">
                                            <div className="detail-label">Tipo de Solicitud</div>
                                            <div className="detail-value">{ticket.tipo_solicitud}</div>
                                        </div>
                                        <div className="detail-field">
                                            <div className="detail-label">Proveedor</div>
                                            <div className="detail-value">{ticket.proveedor_nombre || '—'}</div>
                                        </div>
                                        <div className="detail-field">
                                            <div className="detail-label">Monto Solicitado</div>
                                            <div className="detail-value" style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: 18 }}>{ticket.moneda === 'USD' ? 'US$' : '$'}{ticket.monto?.toLocaleString()}</div>
                                        </div>
                                        <div className="detail-field">
                                            <div className="detail-label">Operador</div>
                                            <div className="detail-value">{ticket.operador || '—'}</div>
                                        </div>
                                        <div className="detail-field">
                                            <div className="detail-label">Caso Sernac</div>
                                            <div className="detail-value">{ticket.sernac ? <span style={{ color: '#DE3C3C', fontWeight: 700 }}>Sí</span> : 'No'}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 16 }}>
                                        <div className="detail-label">Descripción</div>
                                        <div className="detail-value" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: ticket.descripcion_html || ticket.descripcion }}></div>
                                    </div>

                                    <div className="form-row" style={{ marginTop: 16, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                                        <span>📅 Creado: {formatDate(ticket.fecha_creacion)}</span>
                                        <span>🔖 File: #{ticket.num_file}</span>
                                    </div>
                                </div>
                            </div>

                            {/* NUEVA SECCIÓN: Desglose de Devolución (En su propia Card) */}
                            {ticket.prog_pax > 0 && (
                                <div className="card" style={{ marginTop: 20 }}>
                                    <div className="card-header" style={{ background: '#f8fafc' }}>
                                        <h2>📊 Desglose de Devolución</h2>
                                    </div>
                                    <div className="card-body">
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, border: '2px solid #2d5a27' }}>
                                            <thead>
                                                <tr style={{ background: '#f1f5f9' }}>
                                                    <th style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'left' }}>Detalle</th>
                                                    <th style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'center', width: '10%' }}>Pax</th>
                                                    <th style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right', width: '25%' }}>Valor</th>
                                                    <th style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right', width: '25%' }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', fontWeight: 600, background: '#f9fafb' }}>Valor Programa</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'center' }}>{ticket.prog_pax}</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right' }}>{ticket.moneda === 'USD' ? 'US$' : '$'}{ticket.prog_valor?.toLocaleString()}</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right', fontWeight: 600 }}>{ticket.moneda === 'USD' ? 'US$' : '$'}{ticket.prog_total?.toLocaleString()}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', fontWeight: 600, background: '#f9fafb' }}>Tasas de Embarque</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'center' }}>{ticket.tasas_pax}</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right' }}>{ticket.moneda === 'USD' ? 'US$' : '$'}{ticket.tasas_valor?.toLocaleString()}</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right', fontWeight: 600 }}>{ticket.moneda === 'USD' ? 'US$' : '$'}{ticket.tasas_total?.toLocaleString()}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', fontWeight: 600, background: '#f9fafb' }}>Q de Seguridad</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'center' }}>{ticket.qseg_pax}</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right' }}>{ticket.moneda === 'USD' ? 'US$' : '$'}{ticket.qseg_valor?.toLocaleString()}</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right', fontWeight: 600 }}>{ticket.moneda === 'USD' ? 'US$' : '$'}{ticket.qseg_total?.toLocaleString()}</td>
                                                </tr>
                                                <tr style={{ background: '#fff2cc', fontWeight: 700 }}>
                                                    <td colSpan={3} style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right' }}>Retención % {ticket.retencion_pct}%:</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right', color: '#dc2626' }}>- {ticket.moneda === 'USD' ? 'US$' : '$'}{ticket.retencion_valor?.toLocaleString()}</td>
                                                </tr>
                                                <tr style={{ background: '#f1f5f9', fontWeight: 800, fontSize: 15 }}>
                                                    <td colSpan={3} style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right', textTransform: 'uppercase' }}>Total a Devolver:</td>
                                                    <td style={{ padding: 10, border: '1px solid #2d5a27', textAlign: 'right', color: '#2d5a27' }}>{ticket.moneda === 'USD' ? 'US$' : '$'}{ticket.total_con_retencion?.toLocaleString()}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Cuentas Corrientes Viewer */}
                            {ticket.cuentas_corrientes && ticket.cuentas_corrientes.length > 0 && ticket.cuentas_corrientes.some(c => c.rut || c.cuenta) && (
                                <div className="card" style={{ marginTop: 20 }}>
                                    <div className="card-header" style={{ background: '#f8fafc' }}><h2>🏦 Cuentas Corrientes Registradas</h2></div>
                                    <div className="card-body">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            {ticket.cuentas_corrientes.map((c, i) => c.rut || c.cuenta ? (
                                                <div key={i} style={{ padding: 12, border: '1px solid #2d5a27', borderRadius: 6, background: '#f8fafc' }}>
                                                    <strong style={{ display: 'block', marginBottom: 6, color: '#2d5a27' }}>Opción {i + 1}</strong>
                                                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                                                        <div><strong>Nombre:</strong> {c.nombre || '-'}</div>
                                                        <div><strong>RUT:</strong> {c.rut || '-'}</div>
                                                        <div><strong>Banco:</strong> {c.banco || '-'}</div>
                                                        <div><strong>Cuenta:</strong> {c.cuenta || '-'}</div>
                                                        <div><strong>Mail:</strong> {c.mail || '-'}</div>
                                                    </div>
                                                </div>
                                            ) : null)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Nota de Crédito Viewer (Updated to Table Format) */}
                            {((ticket.nc_pct > 0) || (ticket.nota_credito && (ticket.nota_credito.neto > 0 || ticket.nota_credito.tc > 0))) && (
                                <div className="card" style={{ marginTop: 20 }}>
                                    <div className="card-header" style={{ background: '#f8fafc' }}><h2>📄 Nota de Crédito</h2></div>
                                    <div className="card-body">
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, border: '2px solid #000', marginBottom: 16 }}>
                                            <thead>
                                                <tr style={{ background: '#fff', textAlign: 'center' }}>
                                                    <th style={{ padding: '10px', border: '1px solid #000', width: '40%' }}>Detalle</th>
                                                    <th style={{ padding: '10px', border: '1px solid #000', width: '30%', fontWeight: 'bold' }}>$ (CLP)</th>
                                                    <th style={{ padding: '10px', border: '1px solid #000', width: '30%', fontWeight: 'bold' }}>U$ (USD)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '10px', border: '1px solid #000', fontWeight: 'bold', background: '#f9fafb' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>Tipo de Cambio File:</span>
                                                            <span>{ticket.cambio?.toLocaleString()}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'right', background: '#f9fafb' }}>-</td>
                                                    <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'right', background: '#f9fafb' }}>-</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '10px', border: '1px solid #000', fontWeight: 'bold', background: '#f9fafb' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>Nota de Crédito (%):</span>
                                                            <span>{ticket.nc_pct}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'right' }}>${ticket.nc_clp?.toLocaleString()}</td>
                                                    <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'right' }}>{ticket.moneda === 'USD' ? `US$${ticket.nc_usd?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '10px', border: '1px solid #000', background: '#f9fafb' }}>IVA 19%</td>
                                                    <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'right' }}>${ticket.nc_iva_clp?.toLocaleString()}</td>
                                                    <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'right' }}>{ticket.moneda === 'USD' ? `US$${ticket.nc_iva_usd?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}</td>
                                                </tr>
                                                <tr style={{ fontWeight: 'bold', background: '#f1f5f9' }}>
                                                    <td style={{ padding: '10px', border: '1px solid #000' }}>TOTAL NOTA DE CRÉDITO</td>
                                                    <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'right', color: '#2d5a27' }}>${ticket.nc_total_clp?.toLocaleString()}</td>
                                                    <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'right', color: '#2d5a27' }}>{ticket.moneda === 'USD' ? `US$${ticket.nc_total_usd?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {(ticket.nota_credito?.archivo || ticket.archivo_nc) && (
                                            <div style={{ textAlign: 'right' }}>
                                                <a href={ticket.nota_credito?.archivo || ticket.archivo_nc} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13, borderRadius: 6 }}>
                                                    📎 Ver Archivo Adjunto (NC)
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Viewer: Monto Final a Devolver */}
                            {ticket.monto_final_devolucion !== undefined && ticket.monto_final_devolucion !== null && (
                                <div style={{ marginTop: 24, padding: '20px 24px', background: '#fefce8', border: '2px solid #eab308', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                                    <span style={{ fontSize: 20, fontWeight: 'bold', color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                                        Monto Final a Devolver ({ticket.moneda}):
                                    </span>
                                    <span style={{ fontSize: 28, fontWeight: '900', color: '#a16207' }}>
                                        {ticket.moneda === 'USD' ? 'US$' : '$'}
                                        {ticket.moneda === 'USD'
                                            ? ticket.monto_final_devolucion.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                            : Math.round(ticket.monto_final_devolucion).toLocaleString()
                                        }
                                    </span>
                                </div>
                            )}

                            {/* Authorization history */}
                            {ticket.autorizaciones?.length > 0 && (
                                <div className="card" style={{ marginTop: 20 }}>
                                    <div className="card-header"><h2>🔐 Autorizaciones</h2></div>
                                    <div className="card-body">
                                        {ticket.autorizaciones.map(a => (
                                            <div key={a.id_autorizacion} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span className={`badge ${a.decision === 'aprobado' ? 'badge-green' : 'badge-red'}`}>
                                                        {a.decision === 'aprobado' ? '✅ Aprobado' : '❌ Rechazado'}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{formatDate(a.fecha)}</span>
                                                </div>
                                                <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>{a.comentario}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <EditarValores
                            ticket={ticket}
                            onCancel={() => setEditMode(false)}
                            onSuccess={() => {
                                setEditMode(false);
                                loadTicket();
                            }}
                        />
                    )}
                </div>

                {/* State Change History (right column) */}
                <div>
                    <div className="card">
                        <div className="card-header"><h2>📜 Historial de Cambios</h2></div>
                        <div className="card-body">
                            {(!ticket.historial || ticket.historial.length === 0) ? (
                                <div className="empty-state" style={{ padding: '20px 0' }}>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Sin historial</p>
                                </div>
                            ) : (
                                <div className="timeline">
                                    {ticket.historial.map(h => (
                                        <div key={h.id} className="timeline-item">
                                            <div className="timeline-dot" style={{ background: h.estado_nuevo_color || 'var(--color-primary)' }}></div>
                                            <div className="timeline-content">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                    <span className="badge" style={{ background: (h.estado_nuevo_color || '#666') + '22', color: h.estado_nuevo_color, fontSize: 11 }}>
                                                        {h.estado_nuevo_nombre}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{formatDate(h.fecha)}</span>
                                                </div>
                                                <p style={{ fontSize: 13, margin: '4px 0', color: 'var(--color-text)' }}>{h.descripcion}</p>
                                                {h.archivos && h.archivos.length > 0 && (
                                                    <div style={{ marginTop: 6, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {h.archivos.map((a, i) => (
                                                            <a key={i} href={a.url} target="_blank" rel="noreferrer"
                                                                className="badge badge-gray" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid var(--color-border)' }}>
                                                                📎 {a.nombre}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                                                    {h.estado_anterior_nombre && h.estado_anterior_nombre !== '—' && <span>De <em>{h.estado_anterior_nombre}</em> → </span>}
                                                    por <strong>{h.usuario_nombre}</strong>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* State Change Modal */}
            <Modal isOpen={showEstadoModal} onClose={() => setShowEstadoModal(false)} title="Cambiar Estado del Caso"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowEstadoModal(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleCambiarEstado} disabled={changingState || !nuevoEstado || !estadoDesc.trim()}>
                        {changingState ? '⏳...' : '🔄 Cambiar Estado'}
                    </button>
                </>}>
                <div className="form-group">
                    <label className="form-label">Nuevo Estado <span className="required">*</span></label>
                    <select className="form-select" value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
                        <option value="">Seleccionar estado...</option>
                        {(ticket.estados_permitidos || []).filter(e => e.id_estado !== ticket.id_estado).map(e => (
                            <option key={e.id_estado} value={e.id_estado}>{e.nombre}</option>
                        ))}
                    </select>
                    {ticket.estados_permitidos?.length === 0 && (
                        <p className="form-help" style={{ color: '#EF4444' }}>No tiene estados permitidos asignados en su perfil.</p>
                    )}
                </div>
                <div className="form-group">
                    <label className="form-label">Descripción del cambio <span className="required">*</span></label>
                    <textarea className="form-textarea" value={estadoDesc} onChange={e => setEstadoDesc(e.target.value)} rows={3} placeholder="Indique el motivo del cambio de estado..." />
                </div>
                <div className="form-group">
                    <label className="form-label">Adjuntar Archivos (Opcional)</label>
                    <FileUpload onFilesSelected={files => setEstadoArchivos(files)} />
                </div>
            </Modal>

            {/* Annul Modal */}
            <Modal isOpen={showAnularModal} onClose={() => setShowAnularModal(false)} title="🚫 Anular Caso"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowAnularModal(false)}>Cancelar</button>
                    <button className="btn" style={{ background: '#EF4444', color: 'white', border: 'none' }} onClick={handleAnular} disabled={anulando || !anularDesc.trim()}>
                        {anulando ? '⏳...' : '🚫 Confirmar Anulación'}
                    </button>
                </>}>
                <div style={{ background: 'rgba(239,68,68,0.08)', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p style={{ fontSize: 14, color: '#991B1B', fontWeight: 600 }}>⚠️ Esta acción no se puede deshacer. El caso quedará marcado como ANULADO permanentemente.</p>
                </div>
                <div className="form-group">
                    <label className="form-label">Motivo de anulación <span className="required">*</span></label>
                    <textarea className="form-textarea" value={anularDesc} onChange={e => setAnularDesc(e.target.value)} rows={3} placeholder="Describa el motivo de la anulación..." />
                </div>
            </Modal>

            {/* Edit Basic Info Modal */}
            <Modal isOpen={showEditTicketModal} onClose={() => setShowEditTicketModal(false)} title="📝 Editar Información del Caso"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowEditTicketModal(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                        {saving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                    </button>
                </>}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    ℹ️ Los datos provenientes del número de File (pasajero, agencia, fechas) no son editables desde este formulario.
                </div>

                <div className="form-group">
                    <label className="form-label">Tipo de Solicitud <span className="required">*</span></label>
                    <select className="form-select" value={editForm.id_tipo_solicitud} onChange={e => setEditForm({ ...editForm, id_tipo_solicitud: e.target.value })}>
                        <option value="1">Devolución</option>
                        <option value="2">Reclamo</option>
                        <option value="3">Anomalía</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Sernac</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                        <input type="checkbox" checked={editForm.sernac} onChange={e => setEditForm({ ...editForm, sernac: e.target.checked })} style={{ width: 16, height: 16 }} />
                        Marcar como caso SERNAC
                    </label>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Proveedor Asociado</label>
                        {isProviderEditDisabled ? (
                            <div className="provider-list">
                                <div className="provider-item selected" style={{ cursor: 'not-allowed', opacity: 0.7 }}>
                                    <div className="provider-check">✓</div>
                                    <span className="provider-name">{editForm.proveedor_nombre || 'Ninguno / En blanco'}</span>
                                    <span className="provider-code">{editForm.proveedor_id || '---'}</span>
                                </div>
                                <p className="form-help" style={{ color: '#F59E0B' }}>
                                    ⚠️ No se puede cambiar el proveedor en el estado actual ({ticket.estado_nombre}).
                                </p>
                            </div>
                        ) : ticket.proveedores && ticket.proveedores.length > 0 ? (
                            <div className="provider-list">
                                <div
                                    className={`provider-item ${!editForm.proveedor_id ? 'selected' : ''}`}
                                    onClick={() => setEditForm({ ...editForm, proveedor_id: '', proveedor_nombre: '' })}
                                >
                                    <div className="provider-check">{!editForm.proveedor_id && '✓'}</div>
                                    <span className="provider-name" style={{ fontStyle: 'italic', color: '#64748b' }}>Sin proveedor asociado (Dejar en blanco)</span>
                                </div>
                                {ticket.proveedores.map(p => (
                                    <div
                                        key={p.codigo}
                                        className={`provider-item ${editForm.proveedor_id === p.codigo ? 'selected' : ''}`}
                                        onClick={() => setEditForm({ ...editForm, proveedor_id: p.codigo, proveedor_nombre: p.nombre })}
                                    >
                                        <div className="provider-check">
                                            {editForm.proveedor_id === p.codigo && '✓'}
                                        </div>
                                        <span className="provider-name">{p.nombre}</span>
                                        <span className="provider-code">{p.codigo}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ color: '#64748b', fontSize: 13, background: '#f8fafc', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                El File Oris de este caso no trajo proveedores asociados, o estaba en blanco.
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Moneda</label>
                        <select className="form-select" value={editForm.moneda} onChange={e => setEditForm({ ...editForm, moneda: e.target.value })}>
                            <option value="CLP">CLP ($)</option>
                            <option value="USD">USD (US$)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Monto Solicitado <span className="required">*</span></label>
                        <input
                            type="number"
                            className="form-input"
                            value={editForm.monto}
                            onChange={e => setEditForm({ ...editForm, monto: e.target.value })}
                            placeholder="Ej. 150000"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Descripción Detallada <span className="required">*</span></label>
                    <textarea
                        className="form-textarea"
                        rows={6}
                        value={editForm.descripcion}
                        onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                        placeholder="Actualice la descripción del ticket..."
                    ></textarea>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Adjuntar Archivos (Opcional)</label>
                    <FileUpload onFilesSelected={files => setEditForm({ ...editForm, archivos: files })} />
                </div>
            </Modal>

            {/* Custom Interactive Confirm Modal */}
            {actionToConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                    <div className="card fade-in" style={{ width: '90%', maxWidth: '420px', padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ background: actionToConfirm.isCritical ? '#fef2f2' : '#f8fafc', padding: '24px', borderBottom: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: actionToConfirm.isCritical ? '#fee2e2' : '#e0e7ff', color: actionToConfirm.isCritical ? '#ef4444' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                    {actionToConfirm.isCritical ? '⚠️' : '❓'}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '18px', color: actionToConfirm.isCritical ? '#991b1b' : '#0f172a', fontWeight: '800' }}>
                                    {actionToConfirm.title}
                                </h3>
                            </div>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <p style={{ margin: 0, color: '#475569', fontSize: '15px', lineHeight: '1.6' }}>
                                {actionToConfirm.message}
                            </p>
                        </div>
                        <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setActionToConfirm(null)}>Cancelar</button>
                            <button className={actionToConfirm.isCritical ? 'btn' : 'btn btn-primary'} style={actionToConfirm.isCritical ? { background: '#ef4444', color: 'white', border: 'none', padding: '8px 24px' } : { padding: '8px 24px' }} onClick={handleConfirmYes}>
                                {actionToConfirm.isCritical ? 'Sí, Anular' : 'Sí, Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
