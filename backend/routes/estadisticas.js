const express = require('express');
const mockData = require('../data/mock');
const { getConnection, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/estadisticas/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') {
            // (Mock logic kept for reference but skip it to save space, or just keep simple)
            return res.json({ kpis: {}, porEstado: [], porTipo: [], porProveedor: [], porAgencia: [], tendenciaMensual: [], tendenciaMensualMontos: [], montoPorProveedor: [] });
        }

        const pool = await getConnection();

        // Vamos a traer todos los tickets para calcular (o podríamos hacer queries agregadas)
        // Por simplicidad y ya que es un dashboard, traemos tickets
        const ticketsRes = await pool.request().query('SELECT * FROM tickets WHERE anulado = 0');
        const estadosRes = await pool.request().query('SELECT * FROM estados');
        const tiposRes = await pool.request().query('SELECT * FROM tipos_solicitud');

        const tickets = ticketsRes.recordset;
        const estadosMap = {};
        estadosRes.recordset.forEach(e => estadosMap[e.id_estado] = e);

        const tiposMap = {};
        tiposRes.recordset.forEach(t => tiposMap[t.id_tipo] = t);

        const totalReclamos = tickets.filter(t => t.id_tipo_solicitud === 1).length;
        const totalDevoluciones = tickets.filter(t => t.id_tipo_solicitud === 2).length;
        const totalOtras = tickets.filter(t => ![1, 2].includes(t.id_tipo_solicitud)).length;
        const montoTotalCLP = tickets.filter(t => t.moneda === 'CLP').reduce((sum, t) => sum + (t.monto_final_devolucion || 0), 0);
        const montoTotalUSD = tickets.filter(t => t.moneda === 'USD').reduce((sum, t) => sum + (t.monto_final_devolucion || 0), 0);
        // Aprobados (Estado 4)
        const montoAprobadoCLP = tickets.filter(t => t.id_estado === 4 && t.moneda === 'CLP').reduce((sum, t) => sum + (t.monto_final_devolucion || 0), 0);
        const montoAprobadoUSD = tickets.filter(t => t.id_estado === 4 && t.moneda === 'USD').reduce((sum, t) => sum + (t.monto_final_devolucion || 0), 0);
        // Cerrados (Estado 6)
        const montoCerradoCLP = tickets.filter(t => t.id_estado === 6 && t.moneda === 'CLP').reduce((sum, t) => sum + (t.monto_final_devolucion || 0), 0);
        const montoCerradoUSD = tickets.filter(t => t.id_estado === 6 && t.moneda === 'USD').reduce((sum, t) => sum + (t.monto_final_devolucion || 0), 0);

        const porEstadoMap = {};
        tickets.forEach(t => {
            porEstadoMap[t.id_estado] = (porEstadoMap[t.id_estado] || 0) + 1;
        });
        const porEstado = Object.keys(porEstadoMap).map(id => ({
            nombre: estadosMap[id]?.nombre || 'Desconocido',
            color: estadosMap[id]?.color || '#999',
            cantidad: porEstadoMap[id]
        }));

        const porTipoMap = {};
        tickets.forEach(t => {
            porTipoMap[t.id_tipo_solicitud] = (porTipoMap[t.id_tipo_solicitud] || 0) + 1;
        });
        const porTipo = Object.keys(porTipoMap).map(id => ({
            nombre: tiposMap[id]?.nombre || 'Desconocido',
            cantidad: porTipoMap[id]
        }));

        // By provider
        const proveedorMap = {};
        tickets.forEach(t => {
            if (t.proveedor_nombre) {
                if (!proveedorMap[t.proveedor_nombre]) {
                    proveedorMap[t.proveedor_nombre] = { cantidad: 0, clp: 0, usd: 0 };
                }
                proveedorMap[t.proveedor_nombre].cantidad += 1;
                if (t.moneda === 'CLP') proveedorMap[t.proveedor_nombre].clp += (t.monto_final_devolucion || 0);
                if (t.moneda === 'USD') proveedorMap[t.proveedor_nombre].usd += (t.monto_final_devolucion || 0);
            }
        });
        const porProveedor = Object.entries(proveedorMap).map(([nombre, data]) => ({ nombre, cantidad: data.cantidad, clp: data.clp, usd: data.usd }))
            .sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);

        // By agency
        const agenciaMap = {};
        tickets.forEach(t => {
            if (t.agencia) {
                agenciaMap[t.agencia] = (agenciaMap[t.agencia] || 0) + 1;
            }
        });
        const porAgencia = Object.entries(agenciaMap).map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);

        // Monthly trend
        const monthlyMap = {};
        tickets.forEach(t => {
            if (!t.fecha_creacion) return;
            const d = new Date(t.fecha_creacion);
            const month = d.toISOString().substring(0, 7);
            monthlyMap[month] = (monthlyMap[month] || 0) + 1;
        });
        const tendenciaMensual = Object.entries(monthlyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([mes, cantidad]) => ({ mes, cantidad }));

        // Monto by provider
        const montoProveedorMap = {};
        tickets.forEach(t => {
            if (t.proveedor_nombre) {
                montoProveedorMap[t.proveedor_nombre] = (montoProveedorMap[t.proveedor_nombre] || 0) + (t.monto_final_devolucion || 0);
            }
        });
        const montoPorProveedor = Object.entries(montoProveedorMap).map(([nombre, monto]) => ({ nombre, monto }))
            .sort((a, b) => b.monto - a.monto).slice(0, 10);

        // Mensual Montos (USD and CLP separated)
        const mapMontosMensuales = {};
        tickets.forEach(t => {
            if (!t.fecha_creacion) return;
            const d = new Date(t.fecha_creacion);
            const month = d.toISOString().substring(0, 7);
            if (!mapMontosMensuales[month]) mapMontosMensuales[month] = { mes: month, clp: 0, usd: 0 };
            if (t.moneda === 'CLP') mapMontosMensuales[month].clp += (t.monto_final_devolucion || 0);
            else if (t.moneda === 'USD') mapMontosMensuales[month].usd += (t.monto_final_devolucion || 0);
        });
        const tendenciaMensualMontos = Object.values(mapMontosMensuales).sort((a, b) => a.mes.localeCompare(b.mes));

        res.json({
            kpis: {
                totalTickets: tickets.length,
                totalReclamos,
                totalDevoluciones,
                totalOtras,
                montoTotalCLP,
                montoTotalUSD,
                montoAprobadoCLP,
                montoAprobadoUSD,
                montoCerradoCLP,
                montoCerradoUSD,
                ticketsAbiertos: tickets.filter(t => ![5, 6].includes(t.id_estado)).length,
                ticketsCerrados: tickets.filter(t => t.id_estado === 6).length,
                tiempoPromedioResolucion: 'N/A'
            },
            porEstado,
            porTipo,
            porProveedor,
            porAgencia,
            tendenciaMensual,
            tendenciaMensualMontos,
            montoPorProveedor
        });

    } catch (err) {
        console.error('Error dashboard:', err);
        res.status(500).json({ error: 'Error obteniendo estadisticas reales' });
    }
});

module.exports = router;
