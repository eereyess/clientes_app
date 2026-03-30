import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../api/client';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);

export default function Estadisticas() {
    const [tickets, setTickets] = useState([]);
    const [estados, setEstados] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter state
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');

    // Report specific state
    const [activeReport, setActiveReport] = useState(1); // 1: Fechas, 2: Agencia, 3: Proveedor
    const [paramAgencia, setParamAgencia] = useState('');
    const [paramProveedor, setParamProveedor] = useState('');

    // View mode
    const [viewMode, setViewMode] = useState('detallado'); // detallado | agrupado

    useEffect(() => {
        Promise.all([
            api.get('/tickets?limite=5000'),
            api.get('/parametricas/estados')
        ]).then(([resTickets, resEstados]) => {
            setTickets(resTickets.data.tickets || []);
            setEstados(resEstados.data || []);
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-container"><div className="empty-state"><div className="empty-state-icon">⏳</div><h3>Cargando reportes...</h3></div></div>;

    // Apply global filters
    let filtered = tickets.filter(t => {
        if (fechaDesde && t.fecha_creacion < fechaDesde) return false;
        if (fechaHasta && t.fecha_creacion > fechaHasta) return false;
        if (estadoFiltro && t.id_estado !== parseInt(estadoFiltro)) return false;

        // Report specific filters
        if (activeReport === 2 && paramAgencia && t.agencia !== paramAgencia) return false;
        if (activeReport === 3 && paramProveedor && t.proveedor_nombre !== paramProveedor) return false;

        return true;
    });

    // Totals
    const totalCLP = filtered.filter(t => t.moneda === 'CLP').reduce((sum, t) => sum + (t.monto_final_devolucion || 0), 0);
    const totalUSD = filtered.filter(t => t.moneda === 'USD').reduce((sum, t) => sum + (t.monto_final_devolucion || 0), 0);

    // Export to Excel / CSV
    const exportCSV = () => {
        let csv = 'N Caso,N File,Tipo File,Mes Creacion,Agencia,Proveedor,Monto Aprobado,Moneda,Estado\n';
        filtered.forEach(t => {
            // sanitize quotes
            const d = (t.descripcion || '').replace(/"/g, '""');
            csv += `"${t.numero_ticket}","${t.num_file || ''}","${t.tipof || ''}","${t.fecha_creacion}","${t.agencia || ''}","${t.proveedor_nombre || ''}",${t.monto_final_devolucion || 0},"${t.moneda || 'CLP'}","${t.estado_nombre}"\n`;
        });
        csv += `,,,,,,,,,TOTAL CLP: ${totalCLP}\n`;
        csv += `,,,,,,,,,TOTAL USD: ${totalUSD}\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_gclientes_${new Date().getTime()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Chart Data Preparation (if 'agrupado')
    const buildChartData = () => {
        const labels = [];
        const clpData = [];
        const usdData = [];

        const map = {};

        filtered.forEach(t => {
            let key = 'Otro';
            if (activeReport === 1) key = t.fecha_creacion.substring(0, 7); // Group by Month
            if (activeReport === 2) key = t.agencia || 'Sin Agencia';
            if (activeReport === 3) key = t.proveedor_nombre || 'Sin Proveedor';

            if (!map[key]) map[key] = { clp: 0, usd: 0 };
            if (t.moneda === 'CLP') map[key].clp += (t.monto_final_devolucion || 0);
            else map[key].usd += (t.monto_final_devolucion || 0);
        });

        const sortedKeys = Object.keys(map).sort();
        sortedKeys.forEach(k => {
            labels.push(k);
            clpData.push(map[k].clp);
            usdData.push(map[k].usd);
        });

        return {
            labels,
            datasets: [
                { label: 'Total CLP', data: clpData, backgroundColor: 'rgba(13,148,136,0.8)' },
                { label: 'Total USD', data: usdData, backgroundColor: 'rgba(239,68,68,0.8)' }
            ]
        };
    };

    const agencias = [...new Set(tickets.map(t => t.agencia).filter(Boolean))].sort();
    const proveedores = [...new Set(tickets.map(t => t.proveedor_nombre).filter(Boolean))].sort();

    return (
        <div className="page-container fade-in">
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1>📊 Estadisticas</h1>
                    <p className="page-header-subtitle">Genere reportes detallados y extráigalos en Excel</p>
                </div>
                <button className="btn btn-primary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    📥 Exportar a Excel
                </button>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-body">
                    {/* Filtros Globales */}
                    <h3 style={{ fontSize: 14, color: '#666', marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8 }}>Filtros Globales</h3>
                    <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: 20 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Fecha Desde</label>
                            <input type="date" className="form-input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Fecha Hasta</label>
                            <input type="date" className="form-input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Estado</label>
                            <select className="form-select" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
                                <option value="">(Todos los estados)</option>
                                {estados.map(e => (
                                    <option key={e.id_estado} value={e.id_estado}>{e.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0, borderLeft: '1px solid #ddd', paddingLeft: 16 }}>
                            <label className="form-label">Visualización</label>
                            <div className="btn-group">
                                <button className={`btn btn-sm ${viewMode === 'detallado' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('detallado')}>📄 Detallado</button>
                                <button className={`btn btn-sm ${viewMode === 'agrupado' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('agrupado')}>📊 Agrupado (Gráfico)</button>
                            </div>
                        </div>
                    </div>

                    {/* Selector de Reportes */}
                    <h3 style={{ fontSize: 14, color: '#666', marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8 }}>Tipo de Reporte</h3>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                        <button className={`btn ${activeReport === 1 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport(1)}>General (Fechas)</button>
                        <button className={`btn ${activeReport === 2 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport(2)}>Por Agencia de Viajes</button>
                        <button className={`btn ${activeReport === 3 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport(3)}>Por Proveedor</button>
                    </div>

                    {/* Report Specific Filters */}
                    {activeReport === 2 && (
                        <div className="form-group" style={{ maxWidth: 350 }}>
                            <label className="form-label">Filtrar por Agencia Específica</label>
                            <select className="form-select" value={paramAgencia} onChange={e => setParamAgencia(e.target.value)}>
                                <option value="">(Todas las agencias)</option>
                                {agencias.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    )}

                    {activeReport === 3 && (
                        <div className="form-group" style={{ maxWidth: 350 }}>
                            <label className="form-label">Filtrar por Proveedor Específico</label>
                            <select className="form-select" value={paramProveedor} onChange={e => setParamProveedor(e.target.value)}>
                                <option value="">(Todos los proveedores)</option>
                                {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Resultados */}
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Resultados ({filtered.length} tickets)</h2>
                </div>

                {viewMode === 'detallado' ? (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>N° Caso</th>
                                    <th>N° File</th>
                                    <th>Tipo File</th>
                                    <th>Agencia</th>
                                    <th>Proveedor</th>
                                    <th>Créd. Prov</th>
                                    <th style={{ textAlign: 'right' }}>Monto Aprobado</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(t => (
                                    <tr key={t.id_ticket}>
                                        <td><strong>{t.numero_ticket}</strong></td>
                                        <td>{t.num_file || '—'}</td>
                                        <td>{t.tipof || '—'}</td>
                                        <td>{t.agencia || '—'}</td>
                                        <td>{t.proveedor_nombre || '—'}</td>
                                        <td>{t.credito_proveedor ? '✅' : '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: t.moneda === 'USD' ? '#ef4444' : '#10b981' }}>
                                            {t.moneda === 'USD' ? 'US$' : '$'} {t.monto_final_devolucion?.toLocaleString() || 0}
                                        </td>
                                        <td>
                                            <span className="badge" style={{ background: t.estado_color + '22', color: t.estado_color }}>
                                                {t.estado_nombre}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot style={{ background: '#f8fafc', fontWeight: 700 }}>
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'right', paddingRight: 16 }}>TOTAL USD:</td>
                                    <td style={{ textAlign: 'right', color: '#ef4444' }}>US$ {totalUSD.toLocaleString()}</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'right', paddingRight: 16 }}>TOTAL CLP:</td>
                                    <td style={{ textAlign: 'right', color: '#10b981' }}>$ {totalCLP.toLocaleString()}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                        {filtered.length === 0 && (
                            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
                                No se encontraron tickets para los filtros aplicados.
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ padding: 20 }}>
                        <h3 style={{ textAlign: 'center', marginBottom: 20 }}>
                            {activeReport === 1 ? 'Monto Aprobado por Mes' :
                                activeReport === 2 ? 'Monto Aprobado por Agencia' :
                                    'Monto Aprobado por Proveedor'}
                        </h3>
                        <div style={{ height: 400, maxWidth: 900, margin: '0 auto' }}>
                            <Bar
                                data={buildChartData()}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: { y: { beginAtZero: true } }
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
