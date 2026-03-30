const express = require('express');
const mockData = require('../data/mock');
const { getConnection, sql } = require('../config/db');

const router = express.Router();

function getIdField(name) {
    const fields = { tipos_solicitud: 'id_tipo', estados: 'id_estado', roles: 'id_rol' };
    return fields[name] || 'id';
}

// GET /api/parametricas/:tabla
router.get('/:tabla', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') {
            const tableData = mockData[req.params.tabla];
            if (!tableData) return res.status(404).json({ error: 'Tabla no encontrada' });
            return res.json(tableData.filter(r => r.activo !== false));
        }

        const tabla = req.params.tabla;
        if (!['tipos_solicitud', 'estados', 'roles'].includes(tabla)) {
            return res.status(404).json({ error: 'Tabla no encontrada' });
        }

        const pool = await getConnection();
        const result = await pool.request().query(`SELECT * FROM ${tabla} WHERE activo = 1`);
        
        const records = result.recordset.map(row => {
            if (tabla === 'roles') {
                if (typeof row.accesos_menu === 'string') {
                    try { row.accesos_menu = JSON.parse(row.accesos_menu); } catch (e) { }
                }
                if (typeof row.estados_permitidos === 'string') {
                    try { row.estados_permitidos = JSON.parse(row.estados_permitidos); } catch (e) { }
                }
            }
            return row;
        });
        
        res.json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo paramétrica' });
    }
});

// GET /api/parametricas/:tabla/all
router.get('/:tabla/all', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') {
            const tableData = mockData[req.params.tabla];
            if (!tableData) return res.status(404).json({ error: 'Tabla no encontrada' });
            return res.json(tableData);
        }

        const tabla = req.params.tabla;
        if (!['tipos_solicitud', 'estados', 'roles'].includes(tabla)) {
            return res.status(404).json({ error: 'Tabla no encontrada' });
        }

        const pool = await getConnection();
        const result = await pool.request().query(`SELECT * FROM ${tabla}`);

        const records = result.recordset.map(row => {
            if (tabla === 'roles') {
                if (typeof row.accesos_menu === 'string') {
                    try { row.accesos_menu = JSON.parse(row.accesos_menu); } catch (e) { }
                }
                if (typeof row.estados_permitidos === 'string') {
                    try { row.estados_permitidos = JSON.parse(row.estados_permitidos); } catch (e) { }
                }
            }
            return row;
        });

        res.json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo paramétrica completa' });
    }
});

// POST /api/parametricas/:tabla (Simplificamos para esta demo)
router.post('/:tabla', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') return res.status(201).json({ message: 'Mock created' });

        const tabla = req.params.tabla;
        if (!['tipos_solicitud', 'estados', 'roles'].includes(tabla)) {
            return res.status(404).json({ error: 'Tabla no permitida' });
        }

        const pool = await getConnection();
        const body = { ...req.body };
        // Si hay campos que son objetos o arrays, los pasamos a string
        Object.keys(body).forEach(key => {
            if (typeof body[key] === 'object' && body[key] !== null) {
                body[key] = JSON.stringify(body[key]);
            }
        });

        const keys = Object.keys(body);
        const values = Object.values(body);

        let query = `INSERT INTO ${tabla} (${keys.join(',')}) VALUES (${keys.map((_, i) => '@p' + i).join(',')})`;

        const request = pool.request();
        values.forEach((v, i) => request.input('p' + i, v));

        await request.query(query);
        res.status(201).json({ message: 'Registro creado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error guardando registro' });
    }
});

// PUT y DELETE se manejan de manera abstracta
router.put('/:tabla/:id', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') return res.json({ message: 'Mock updated' });

        const tabla = req.params.tabla;
        const idField = getIdField(tabla);
        const id = parseInt(req.params.id);
        const pool = await getConnection();
        const body = { ...req.body };
        // Limpiamos el ID del body si viene
        delete body[idField];

        // Stringify objetos
        Object.keys(body).forEach(key => {
            if (typeof body[key] === 'object' && body[key] !== null) {
                body[key] = JSON.stringify(body[key]);
            }
        });

        const updatePoints = Object.keys(body).map((k, i) => `${k} = @p${i}`).join(', ');
        const request = pool.request();
        Object.values(body).forEach((v, i) => request.input('p' + i, v));
        request.input('id', sql.Int, id);

        const queryStr = `UPDATE ${tabla} SET ${updatePoints} WHERE ${idField} = @id`;
        console.log(">>> UPDATE QUERY:", queryStr);
        console.log(">>> ID:", id);
        console.dir(body, {depth: null});

        await request.query(queryStr);
        res.json({ message: 'Registro actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error actualizando registro' });
    }
});

router.delete('/:tabla/:id', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') return res.json({ message: 'Mock deleted' });

        const tabla = req.params.tabla;
        const idField = getIdField(tabla);
        const pool = await getConnection();
        await pool.request().input('id', sql.Int, parseInt(req.params.id)).query(`UPDATE ${tabla} SET activo = 0 WHERE ${idField} = @id`);
        res.json({ message: 'Registro desactivado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error desactivando registro' });
    }
});

module.exports = router;
