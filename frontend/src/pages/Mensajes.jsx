import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Mensajes() {
    const [mensajes, setMensajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const navigate = useNavigate();

    useEffect(() => { loadMessages(); }, []);

    const loadMessages = () => {
        api.get('/mensajes')
            .then(res => setMensajes(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const markRead = async (msg) => {
        setSelected(msg);
        if (!msg.leido) {
            await api.put(`/mensajes/${msg.id_notificacion}/read`);
            setMensajes(prev => prev.map(m => m.id_notificacion === msg.id_notificacion ? { ...m, leido: true } : m));
        }
    };

    const markAllRead = async () => {
        await api.put('/mensajes/read-all');
        setMensajes(prev => prev.map(m => ({ ...m, leido: true })));
    };

    const unreadCount = mensajes.filter(m => !m.leido).length;

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1>Mensajes</h1>
                    <p className="page-header-subtitle">{unreadCount} sin leer de {mensajes.length} total</p>
                </div>
                {unreadCount > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={markAllRead}>✓ Marcar todos como leídos</button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
                <div className="card">
                    {loading ? (
                        <div className="empty-state"><div className="empty-state-icon">⏳</div><h3>Cargando...</h3></div>
                    ) : mensajes.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">✉️</div>
                            <h3>Sin mensajes</h3>
                            <p>No tiene mensajes en su bandeja</p>
                        </div>
                    ) : (
                        <div className="message-list">
                            {mensajes.map(m => (
                                <div
                                    key={m.id_notificacion}
                                    className={`message-item${!m.leido ? ' unread' : ''}${selected?.id_notificacion === m.id_notificacion ? ' selected' : ''}`}
                                    onClick={() => markRead(m)}
                                    style={selected?.id_notificacion === m.id_notificacion ? { background: 'var(--color-bg-hover)' } : {}}
                                >
                                    <div className="message-avatar" style={{ background: m.tipo === 'info' ? '#e0e7ff' : m.tipo === 'warning' ? '#fef3c7' : '#fee2e2', color: m.tipo === 'info' ? '#4f46e5' : m.tipo === 'warning' ? '#f59e0b' : '#ef4444' }}>
                                        {m.tipo === 'info' ? 'ℹ️' : m.tipo === 'warning' ? '⚠️' : '🚨'}
                                    </div>
                                    <div className="message-content">
                                        <div className="message-subject">{m.titulo}</div>
                                        <div className="message-preview">{m.mensaje}</div>
                                    </div>
                                    <div className="message-meta">
                                        <span className="message-date">{new Date(m.fecha_creacion).toLocaleDateString()}</span>
                                        {!m.leido && <div className="message-unread-dot"></div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selected && (
                    <div className="card slide-up">
                        <div className="card-header">
                            <h2>{selected.titulo}</h2>
                            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                                <div className="message-avatar" style={{ width: 36, height: 36, fontSize: '14px', background: selected.tipo === 'info' ? '#e0e7ff' : selected.tipo === 'warning' ? '#fef3c7' : '#fee2e2', color: selected.tipo === 'info' ? '#4f46e5' : selected.tipo === 'warning' ? '#f59e0b' : '#ef4444' }}>
                                    {selected.tipo === 'info' ? 'ℹ️' : selected.tipo === 'warning' ? '⚠️' : '🚨'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{selected.origen_nombre || 'Sistema de Casos'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>{new Date(selected.fecha_creacion).toLocaleString()}</div>
                                </div>
                            </div>
                            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>{selected.mensaje}</p>
                            {selected.ticket_numero && (
                                <button
                                    className="btn btn-outline btn-sm"
                                    style={{ marginTop: 16 }}
                                    onClick={() => {
                                        const ticket = selected.id_ticket;
                                        if (ticket) navigate(`/tickets/${ticket}`);
                                    }}
                                >
                                    🎫 Ver Caso {selected.ticket_numero}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
