import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { PlusCircle, Search } from 'lucide-react';

export const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
        const [year, month, day] = dateString.split('T')[0].split('-');
        if (!year || !month || !day) return dateString;
        return `${day}-${month}-${year}`;
    } catch (e) {
        return dateString;
    }
};

export default function TicketLista() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [buscar, setBuscar] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [listaTipos, setListaTipos] = useState([]);

    useEffect(() => {
        api.get('/parametricas/tipos_solicitud')
            .then(res => setListaTipos(res.data))
            .catch(console.error);
    }, []);

    useEffect(() => { loadTickets(); }, [filtroEstado, filtroTipo]);

    const loadTickets = () => {
        setLoading(true);
        const params = {};
        if (filtroEstado) params.estado = filtroEstado;
        if (filtroTipo) params.tipo = filtroTipo;
        api.get('/tickets', { params })
            .then(res => setTickets(res.data.tickets || res.data)) // Adjust for new paginated response OR old flat array
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const filtered = tickets.filter(t => {
        if (!buscar) return true;
        const q = buscar.toLowerCase();
        return t.numero_ticket.toLowerCase().includes(q) ||
            t.num_file.includes(q) ||
            (t.pasajero || '').toLowerCase().includes(q) ||
            (t.agencia || '').toLowerCase().includes(q) ||
            (t.proveedor_nombre || '').toLowerCase().includes(q);
    });

    if (loading) return <div className="page-container"><div className="empty-state"><div className="empty-state-icon">⏳</div><h3>Cargando...</h3></div></div>;

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1>Casos</h1>
                    <p className="page-header-subtitle">{filtered.length} casos encontrados</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/tickets/nuevo')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PlusCircle size={18} /> Nuevo Caso</button>
            </div>

            <div className="filters-bar">
                <div className="form-group" style={{ marginBottom: 0, flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Buscar por caso, file, pasajero, agencia o proveedor..." value={buscar} onChange={e => setBuscar(e.target.value)} />
                </div>
                <select className="form-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width: 180 }}>
                    <option value="">Todos los estados</option>
                    <option value="1">Nuevo</option>
                    <option value="2">En revisión</option>
                    <option value="3">Pend. autorización</option>
                    <option value="4">Aprobado</option>
                    <option value="5">Rechazado</option>
                    <option value="6">Cerrado</option>
                    <option value="7">Anulado</option>
                </select>
                <select className="form-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ width: 160 }}>
                    <option value="">Todos los tipos</option>
                    {listaTipos.map(t => (
                        <option key={t.id_tipo} value={t.id_tipo}>{t.nombre}</option>
                    ))}
                </select>
            </div>

            <div className="card" style={{ background: 'transparent', boxShadow: 'none' }}>
                <div className="table-container">
                    <table className="premium-ticket-grid">
                        <thead>
                            <tr>
                                <th>Caso</th>
                                <th>Tipo</th>
                                <th style={{ textAlign: 'center' }}>Neg.</th>
                                <th>File</th>
                                <th>Pasajero</th>
                                <th>Agencia</th>
                                <th>Proveedor</th>
                                <th>Monto Aprobado</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(t => (
                                <tr key={t.id_ticket || t.numero_ticket}
                                    onClick={() => {
                                        if (t.id_ticket) navigate(`/tickets/${t.id_ticket}`);
                                    }}
                                    style={{ cursor: 'pointer', opacity: t.anulado ? 0.55 : 1 }}>
                                    <td style={{ whiteSpace: 'nowrap' }}><strong style={{ color: 'var(--color-primary)' }}>{t.numero_ticket}</strong></td>
                                    <td><strong>{t.tipo_solicitud}</strong></td>
                                    <td style={{ textAlign: 'center' }}><span className="badge badge-blue" style={{ fontSize: 11 }}>{t.tipof || '—'}</span></td>
                                    <td>{t.num_file}</td>
                                    <td><strong>{t.pasajero || '—'}</strong></td>
                                    <td>{t.agencia || '—'}</td>
                                    <td>{t.proveedor_nombre || '—'}</td>
                                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {t.monto_final_devolucion && t.monto_final_devolucion > 0
                                            ? `${t.moneda === 'USD' ? 'US$ ' : '$ '}${Number(t.monto_final_devolucion).toLocaleString('es-CL')}`
                                            : ''}
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: (t.estado_color || '#666') + '22', color: t.estado_color }}>
                                            <span className="badge-dot" style={{ background: t.estado_color }}></span>
                                            {t.estado_nombre}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(t.fecha_creacion)}</td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>No se encontraron casos</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
