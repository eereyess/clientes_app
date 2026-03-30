const express = require('express');
const mockData = require('../data/mock');
const { getConnection, sql } = require('../config/db');

const router = express.Router();

// GET /api/configuracion
router.get('/', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') {
            const config = {};
            mockData.configuracion_visual.forEach(c => { config[c.clave] = c.valor; });
            return res.json(config);
        }

        const pool = await getConnection();
        const result = await pool.request().query('SELECT clave, valor FROM configuracion_visual');
        const config = {};
        result.recordset.forEach(c => { config[c.clave] = c.valor; });
        res.json(config);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo configuración' });
    }
});

// GET /api/configuracion/all
router.get('/all', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') return res.json(mockData.configuracion_visual);

        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM configuracion_visual');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo configuración completa' });
    }
});

// PUT /api/configuracion/:clave
router.put('/:clave', async (req, res) => {
    try {
        const { valor } = req.body;
        if (process.env.USE_MOCK === 'true') {
            let configItem = mockData.configuracion_visual.find(c => c.clave === req.params.clave);
            if (configItem) configItem.valor = valor;
            return res.json(configItem || {});
        }

        const pool = await getConnection();

        // Verifica si existe
        const existRes = await pool.request().input('clave', sql.NVarChar, req.params.clave).query('SELECT id_config FROM configuracion_visual WHERE clave = @clave');

        if (existRes.recordset.length > 0) {
            await pool.request()
                .input('clave', sql.NVarChar, req.params.clave)
                .input('valor', sql.NVarChar, valor)
                .query('UPDATE configuracion_visual SET valor = @valor WHERE clave = @clave');
        } else {
            await pool.request()
                .input('clave', sql.NVarChar, req.params.clave)
                .input('valor', sql.NVarChar, valor)
                .input('desc', sql.NVarChar, req.params.clave.replace('_', ' ').toUpperCase())
                .query('INSERT INTO configuracion_visual (clave, valor, descripcion) VALUES (@clave, @valor, @desc)');
        }

        res.json({ clave: req.params.clave, valor });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error actualizando configuración' });
    }
});

module.exports = router;
