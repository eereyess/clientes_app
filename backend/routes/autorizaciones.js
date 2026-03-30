const express = require('express');
const mockData = require('../data/mock');

const router = express.Router();

// GET /api/autorizaciones/ticket/:id
router.get('/ticket/:id', (req, res) => {
    const auths = mockData.autorizaciones
        .filter(a => a.id_ticket === parseInt(req.params.id))
        .map(a => ({
            ...a,
            usuario_nombre: mockData.usuarios.find(u => u.id_usuario === a.id_usuario_autoriza)?.nombre || ''
        }));
    res.json(auths);
});

// POST /api/autorizaciones
router.post('/', (req, res) => {
    const { id_ticket, decision, comentario } = req.body;
    if (!id_ticket || !decision) {
        return res.status(400).json({ error: 'Ticket y decisión son requeridos' });
    }

    const ticket = mockData.tickets.find(t => t.id_ticket === parseInt(id_ticket));
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    const auth = {
        id_autorizacion: mockData.autorizaciones.length + 1,
        id_ticket: parseInt(id_ticket),
        id_usuario_autoriza: req.user.id_usuario,
        fecha: new Date().toISOString().split('T')[0],
        decision,
        comentario: comentario || ''
    };
    mockData.autorizaciones.push(auth);

    // Update ticket status
    if (decision === 'aprobado') ticket.id_estado = 4;
    else if (decision === 'rechazado') ticket.id_estado = 5;
    ticket.fecha_actualizacion = new Date().toISOString().split('T')[0];

    // Notify ticket creator
    mockData.mensajes.push({
        id_mensaje: mockData.mensajes.length + 1,
        id_usuario_destino: ticket.id_usuario_creacion,
        id_usuario_origen: req.user.id_usuario,
        id_ticket: ticket.id_ticket,
        asunto: `Ticket ${decision} - ${ticket.numero_ticket}`,
        mensaje: `Su solicitud ${ticket.numero_ticket} ha sido ${decision}. ${comentario || ''}`,
        leido: false,
        fecha: new Date().toISOString().split('T')[0]
    });

    res.status(201).json(auth);
});

module.exports = router;
