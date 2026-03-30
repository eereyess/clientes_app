import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import api from '../api/client';
import { Ticket, TrendingUp, DollarSign, AlertTriangle, PlusCircle, BarChart3 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const chartFont = { family: 'Inter', size: 11, weight: '500' };

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/estadisticas/dashboard')
            .then(res => setStats(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-container"><div className="empty-state"><div className="empty-state-icon" style={{ fontSize: 28, display: 'flex', justifyContent: 'center' }}><BarChart3 size={40} /></div><h3>Cargando dashboard...</h3></div></div>;

    const { kpis, porEstado = [], porTipo = [], porProveedor = [], porAgencia = [], tendenciaMensual = [], tendenciaMensualMontos = [] } = stats;

    // --- CHART CONFIGS ---
    const doughnutOpts = {
        plugins: { legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, pointStyle: 'circle', font: chartFont } } },
        cutout: '72%', elements: { arc: { borderWidth: 2, borderColor: '#fff' } }, maintainAspectRatio: false
    };
    const barOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { font: chartFont } },
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: chartFont } }
        }
    };
    const barOptsLegend = {
        ...barOpts,
        plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', font: chartFont, padding: 16 } } }
    };

    // Tickets por estado (Doughnut)
    const estadoChart = {
        labels: porEstado.map(e => e.nombre),
        datasets: [{ data: porEstado.map(e => e.cantidad), backgroundColor: porEstado.map(e => e.color), borderWidth: 0 }]
    };

    // Tickets por tipo (Doughnut)
    const tipoChart = {
        labels: porTipo.map(t => t.nombre),
        datasets: [{ data: porTipo.map(t => t.cantidad), backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981'], borderWidth: 0 }]
    };

    // Tickets por agencia (Horizontal Bar)
    const agenciaChart = {
        labels: porAgencia.slice(0, 8).map(a => a.nombre),
        datasets: [{ label: 'Casos', data: porAgencia.slice(0, 8).map(a => a.cantidad), backgroundColor: '#3b82f6', borderRadius: 6, borderSkipped: false }]
    };

    // Tickets por proveedor (Horizontal Bar)
    const provChart = {
        labels: porProveedor.slice(0, 8).map(p => p.nombre),
        datasets: [{ label: 'Casos', data: porProveedor.slice(0, 8).map(p => p.cantidad), backgroundColor: '#0d9488', borderRadius: 6, borderSkipped: false }]
    };

    // Evolución mensual tickets (Bar)
    const trendChart = {
        labels: tendenciaMensual.map(t => t.mes),
        datasets: [{
            label: 'Casos Ingresados',
            data: tendenciaMensual.map(t => t.cantidad),
            backgroundColor: 'rgba(59,130,246,0.75)',
            borderRadius: 6, borderSkipped: false
        }]
    };

    // Montos mensuales CLP y USD (Line dual)
    const montosMensualesChart = {
        labels: tendenciaMensualMontos.map(t => t.mes),
        datasets: [
            {
                label: 'Montos CLP',
                data: tendenciaMensualMontos.map(t => t.clp),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.08)',
                fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#3b82f6', borderWidth: 2
            },
            {
                label: 'Montos USD',
                data: tendenciaMensualMontos.map(t => t.usd),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.08)',
                fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#10b981', borderWidth: 2
            }
        ]
    };
    const lineOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', font: chartFont, padding: 16 } } },
        scales: {
            x: { grid: { display: false }, ticks: { font: chartFont } },
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: chartFont } }
        }
    };

    // Horizontal bar options
    const hBarOpts = {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true, grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: chartFont } },
            y: { grid: { display: false }, ticks: { font: { ...chartFont, size: 12 } } }
        }
    };

    const KpiCard = ({ icon: Icon, color, bgLight, label, value, sub }) => (
        <div style={{
            background: `linear-gradient(to right, ${bgLight}, #ffffff)`,
            borderLeft: `5px solid ${color}`,
            borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 4,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>{label}</span>
                <div style={{ background: `${color}18`, padding: 8, borderRadius: 10, display: 'flex' }}><Icon size={18} color={color} /></div>
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>{value}</span>
            {sub && <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{sub}</span>}
        </div>
    );

    const ChartCard = ({ title, subtitle, children, style }) => (
        <div style={{
            background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', ...style
        }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 0 }}>{subtitle}</p>}
            <div style={{ flex: 1, marginTop: 20, minHeight: 0 }}>{children}</div>
        </div>
    );

    return (
        <div className="page-container fade-in">
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Panel de Control</h1>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Vista general del sistema de casos</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/tickets/nuevo')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PlusCircle size={18} /> Nuevo Caso
                </button>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 28 }}>
                <KpiCard icon={Ticket} color="#3b82f6" bgLight="#eff6ff" label="Total Casos" value={kpis.totalTickets?.toLocaleString()} sub={`${kpis.ticketsAbiertos} abiertos · ${kpis.ticketsCerrados} cerrados`} />
                <KpiCard icon={DollarSign} color="#10b981" bgLight="#ecfdf5" label="Montos Aprobados (CLP)" value={`$ ${((kpis.montoAprobadoCLP || 0) + (kpis.montoCerradoCLP || 0)).toLocaleString()}`} sub="Aprobados + Cerrados" />
                <KpiCard icon={DollarSign} color="#0ea5e9" bgLight="#e0f2fe" label="Montos Aprobados (USD)" value={`US$ ${((kpis.montoAprobadoUSD || 0) + (kpis.montoCerradoUSD || 0)).toLocaleString()}`} sub="Aprobados + Cerrados" />
                <KpiCard icon={AlertTriangle} color="#f59e0b" bgLight="#fffbeb" label="Reclamos" value={kpis.totalReclamos?.toLocaleString()} sub={`${kpis.totalDevoluciones} devoluciones · ${kpis.totalOtras} otras`} />
            </div>

            {/* Row 1: Tendencia mensual + Estados */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
                <ChartCard title="Evolución Mensual de Casos" subtitle="Casos ingresados por mes" style={{ minHeight: 380 }}>
                    <div style={{ height: 280 }}><Bar data={trendChart} options={barOpts} /></div>
                </ChartCard>
                <ChartCard title="Distribución por Estados" subtitle="Estado actual de los casos">
                    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Doughnut data={estadoChart} options={doughnutOpts} />
                    </div>
                </ChartCard>
            </div>

            {/* Row 2: Montos mensuales + Tipos */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
                <ChartCard title="Evolución de Montos Mensuales" subtitle="Comparativa CLP vs USD" style={{ minHeight: 380 }}>
                    <div style={{ height: 280 }}><Line data={montosMensualesChart} options={lineOpts} /></div>
                </ChartCard>
                <ChartCard title="Distribución por Tipo" subtitle="Reclamos, Devoluciones, Otras">
                    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Doughnut data={tipoChart} options={doughnutOpts} />
                    </div>
                </ChartCard>
            </div>

            {/* Row 3: Agencia + Proveedor (horizontal bars) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <ChartCard title="Casos por Agencia" subtitle="Top 8 agencias con mayor actividad" style={{ minHeight: 360 }}>
                    <div style={{ height: 280 }}><Bar data={agenciaChart} options={hBarOpts} /></div>
                </ChartCard>
                <ChartCard title="Casos por Proveedor" subtitle="Top 8 proveedores con más casos" style={{ minHeight: 360 }}>
                    <div style={{ height: 280 }}><Bar data={provChart} options={hBarOpts} /></div>
                </ChartCard>
            </div>
        </div>
    );
}
