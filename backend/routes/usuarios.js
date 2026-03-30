const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authMiddleware, requireRole } = require('../middleware/auth');
const mockData = require('../data/mock');
const { getConnection, sql } = require('../config/db');

router.use(authMiddleware);

// Función auxiliar para parsear JSON de la base de datos
const parseJsonField = (field) => {
    if (!field) return [];
    if (typeof field === 'string') {
        try { return JSON.parse(field); } catch (e) { return []; }
    }
    return field;
};

// GET /api/usuarios
router.get('/', requireRole([1, 2]), async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') {
            const usuarios = mockData.usuarios.map(u => {
                const rol = mockData.roles.find(r => r.id_rol === u.id_rol);
                return { ...u, rol: rol?.nombre || '' };
            });
            return res.json(usuarios);
        }

        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT u.id_usuario, u.nombre, u.email, u.id_rol, r.nombre as rol, 
                   u.activo, u.fecha_creacion, u.visibilidad, u.usuarios_visibles, 
                   u.recibe_notificaciones, u.estados_notificacion
            FROM usuarios u
            LEFT JOIN roles r ON u.id_rol = r.id_rol
        `);

        const usuarios = result.recordset.map(u => ({
            ...u,
            usuarios_visibles: parseJsonField(u.usuarios_visibles),
            estados_notificacion: parseJsonField(u.estados_notificacion)
        }));

        res.json(usuarios);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
});

// GET /api/usuarios/me
router.get('/me', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') {
            // Lógica mock...
            const user = mockData.usuarios.find(u => u.id_usuario === req.user.id_usuario);
            const rol = mockData.roles.find(r => r.id_rol === user.id_rol);
            return res.json({ id_usuario: user.id_usuario, nombre: user.nombre, email: user.email /* ... */ });
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.user.id_usuario)
            .query(`
                SELECT u.*, r.nombre as rol_nombre, r.visibilidad_estados_tipo, r.estados_permitidos, r.accesos_menu 
                FROM usuarios u 
                LEFT JOIN roles r ON u.id_rol = r.id_rol 
                WHERE u.id_usuario = @id
            `);

        const user = result.recordset[0];
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const estados_permitidos_rol = parseJsonField(user.estados_permitidos);
        let estados_permitidos = [];

        if (user.visibilidad_estados_tipo === 'todos') {
            const estadosResult = await pool.request().query('SELECT * FROM estados WHERE activo = 1');
            estados_permitidos = estadosResult.recordset;
        } else if (estados_permitidos_rol.length > 0) {
            const queryEstados = 'SELECT * FROM estados WHERE id_estado IN (' + estados_permitidos_rol.join(',') + ') AND activo = 1';
            const estadosResult = await pool.request().query(queryEstados);
            estados_permitidos = estadosResult.recordset;
        }

        res.json({
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            email: user.email,
            id_rol: user.id_rol,
            rol: user.rol_nombre || '',
            visibilidad: user.visibilidad || 'todos',
            usuarios_visibles: parseJsonField(user.usuarios_visibles),
            estados_permitidos,
            recibe_notificaciones: !!user.recibe_notificaciones,
            estados_notificacion: parseJsonField(user.estados_notificacion),
            accesos_menu: parseJsonField(user.accesos_menu)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo perfil' });
    }
});

// POST /api/usuarios
router.post('/', requireRole([1]), async (req, res) => {
    try {
        const { nombre, email, password, id_rol, visibilidad, usuarios_visibles, recibe_notificaciones, estados_notificacion } = req.body;
        if (!nombre || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });

        const password_hash = bcrypt.hashSync(password, 10);

        if (process.env.USE_MOCK === 'true') {
            // logica mock
            return res.status(201).json({ message: 'Usuario mock creado' });
        }

        const pool = await getConnection();
        const exists = await pool.request().input('email', sql.NVarChar, email).query('SELECT id_usuario FROM usuarios WHERE email = @email');
        if (exists.recordset.length > 0) return res.status(400).json({ error: 'Email ya registrado' });

        const result = await pool.request()
            .input('nombre', sql.NVarChar, nombre)
            .input('email', sql.NVarChar, email)
            .input('password_hash', sql.NVarChar, password_hash)
            .input('id_rol', sql.Int, parseInt(id_rol) || 3)
            .input('visibilidad', sql.NVarChar, visibilidad || 'propios')
            .input('usuarios_visibles', sql.NVarChar, JSON.stringify(usuarios_visibles || []))
            .input('recibe_notificaciones', sql.Bit, !!recibe_notificaciones)
            .input('estados_notificacion', sql.NVarChar, JSON.stringify(estados_notificacion || []))
            .query(`
                INSERT INTO usuarios (nombre, email, password_hash, id_rol, visibilidad, usuarios_visibles, recibe_notificaciones, estados_notificacion) 
                OUTPUT INSERTED.id_usuario 
                VALUES (@nombre, @email, @password_hash, @id_rol, @visibilidad, @usuarios_visibles, @recibe_notificaciones, @estados_notificacion)
            `);

        res.status(201).json({ id_usuario: result.recordset[0].id_usuario, nombre, email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creando usuario' });
    }
});

// PUT /api/usuarios/:id
router.put('/:id', requireRole([1]), async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') return res.json({ message: 'Mock update' });

        const { nombre, email, password, id_rol, activo, visibilidad, usuarios_visibles, recibe_notificaciones, estados_notificacion } = req.body;
        const pool = await getConnection();

        let updateQuery = 'UPDATE usuarios SET ';
        const request = pool.request().input('id', sql.Int, req.params.id);
        const setFields = [];

        if (nombre !== undefined) { setFields.push('nombre = @nombre'); request.input('nombre', sql.NVarChar, nombre); }
        if (email !== undefined) { setFields.push('email = @email'); request.input('email', sql.NVarChar, email); }
        if (password) { setFields.push('password_hash = @hash'); request.input('hash', sql.NVarChar, bcrypt.hashSync(password, 10)); }
        if (id_rol !== undefined) { setFields.push('id_rol = @id_rol'); request.input('id_rol', sql.Int, id_rol); }
        if (activo !== undefined) { setFields.push('activo = @activo'); request.input('activo', sql.Bit, activo); }
        if (visibilidad !== undefined) { setFields.push('visibilidad = @visibilidad'); request.input('visibilidad', sql.NVarChar, visibilidad); }
        if (usuarios_visibles !== undefined) { setFields.push('usuarios_visibles = @uv'); request.input('uv', sql.NVarChar, JSON.stringify(usuarios_visibles)); }
        if (recibe_notificaciones !== undefined) { setFields.push('recibe_notificaciones = @rn'); request.input('rn', sql.Bit, recibe_notificaciones); }
        if (estados_notificacion !== undefined) { setFields.push('estados_notificacion = @en'); request.input('en', sql.NVarChar, JSON.stringify(estados_notificacion)); }

        if (setFields.length === 0) return res.json({ message: 'Sin cambios' });

        updateQuery += setFields.join(', ') + ' WHERE id_usuario = @id';
        await request.query(updateQuery);

        res.json({ message: 'Usuario actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error actualizando usuario' });
    }
});

// DELETE /api/usuarios/:id
router.delete('/:id', requireRole([1]), async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') return res.json({ message: 'Mock delete' });

        const pool = await getConnection();
        await pool.request().input('id', sql.Int, req.params.id).query('UPDATE usuarios SET activo = 0 WHERE id_usuario = @id');
        res.json({ message: 'Usuario desactivado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error desactivando usuario' });
    }
});

module.exports = router;
