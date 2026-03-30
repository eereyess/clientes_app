const express = require('express');
const { getConnection, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/mensajes
router.get('/', async (req, res) => {
    try {
        const pool = await getConnection();
        // Usamos LEFT JOIN para obtener informacion de origen y ticket
        const result = await pool.request()
            .input('id_usuario', sql.Int, req.user.id_usuario)
            .query(`
                SELECT 
                    n.*,
                    u.nombre as origen_nombre,
                    t.numero_ticket as ticket_numero
                FROM notificaciones n
                LEFT JOIN usuarios u ON n.id_usuario_origen = u.id_usuario
                LEFT JOIN tickets t ON n.id_ticket = t.id_ticket
                WHERE n.id_usuario_destino = @id_usuario
                ORDER BY n.fecha_creacion DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error obteniendo mensajes:', err);
        res.status(500).json({ error: 'Error del servidor al cargar mensajes.' });
    }
});

// GET /api/mensajes/unread-count
router.get('/unread-count', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id_usuario', sql.Int, req.user.id_usuario)
            .query(`
                SELECT COUNT(*) as count 
                FROM notificaciones 
                WHERE id_usuario_destino = @id_usuario AND leido = 0
            `);
        res.json({ count: result.recordset[0].count });
    } catch (err) {
        console.error('Error unread-count:', err);
        res.status(500).json({ error: 'Error obteniendo count' });
    }
});

// PUT /api/mensajes/:id/read
router.put('/:id/read', async (req, res) => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('id_usuario', sql.Int, req.user.id_usuario)
            .query(`
                UPDATE notificaciones 
                SET leido = 1 
                WHERE id_notificacion = @id AND id_usuario_destino = @id_usuario
            `);
        res.json({ message: 'Mensaje marcado como leído' });
    } catch (err) {
        console.error('Error marcar leido:', err);
        res.status(500).json({ error: 'Error al marcar como leído' });
    }
});

// PUT /api/mensajes/read-all
router.put('/read-all', async (req, res) => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('id_usuario', sql.Int, req.user.id_usuario)
            .query(`
                UPDATE notificaciones 
                SET leido = 1 
                WHERE id_usuario_destino = @id_usuario AND leido = 0
            `);
        res.json({ message: 'Todos los mensajes marcados como leídos' });
    } catch (err) {
        console.error('Error read-all:', err);
        res.status(500).json({ error: 'Error al marcar todo como leído' });
    }
});

module.exports = router;
