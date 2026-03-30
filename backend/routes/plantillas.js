const express = require('express');
const { getConnection, sql } = require('../config/db');

const router = express.Router();

// GET /api/plantillas
router.get('/', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM plantillas_mail WHERE activo = 1 ORDER BY id_plantilla DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo plantillas' });
    }
});

// GET /api/plantillas/:id
router.get('/:id', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM plantillas_mail WHERE id_plantilla = @id AND activo = 1');

        if (result.recordset.length === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo plantilla' });
    }
});

// POST /api/plantillas
router.post('/', async (req, res) => {
    try {
        const { id_estado, asunto, cuerpo_html } = req.body;
        const pool = await getConnection();

        const result = await pool.request()
            .input('id_estado', sql.Int, id_estado)
            .input('asunto', sql.NVarChar, asunto)
            .input('cuerpo_html', sql.NVarChar, cuerpo_html)
            .query(`
                INSERT INTO plantillas_mail (id_estado, asunto, cuerpo_html)
                OUTPUT INSERTED.*
                VALUES (@id_estado, @asunto, @cuerpo_html)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creando plantilla' });
    }
});

// PUT /api/plantillas/:id
router.put('/:id', async (req, res) => {
    try {
        const { id_estado, asunto, cuerpo_html } = req.body;
        const pool = await getConnection();

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('id_estado', sql.Int, id_estado)
            .input('asunto', sql.NVarChar, asunto)
            .input('cuerpo_html', sql.NVarChar, cuerpo_html)
            .query(`
                UPDATE plantillas_mail
                SET id_estado = @id_estado, asunto = @asunto, cuerpo_html = @cuerpo_html
                OUTPUT INSERTED.*
                WHERE id_plantilla = @id AND activo = 1
            `);

        if (result.recordset.length === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error actualizando plantilla' });
    }
});

// DELETE /api/plantillas/:id
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE plantillas_mail
                SET activo = 0
                WHERE id_plantilla = @id
            `);

        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
        res.json({ message: 'Plantilla eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al anular plantilla' });
    }
});

module.exports = router;
