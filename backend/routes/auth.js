const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mockData = require('../data/mock');
const { getConnection, sql } = require('../config/db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y password son requeridos' });
        }

        let user, rol;

        if (process.env.USE_MOCK === 'true') {
            user = mockData.usuarios.find(u => u.email === email && u.activo);
            if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

            const validPassword = bcrypt.compareSync(password, user.password_hash);
            if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

            rol = mockData.roles.find(r => r.id_rol === user.id_rol);
        } else {
            // CONEXIÓN A LA BASE DE DATOS REAL (SQL SERVER)
            const pool = await getConnection();
            const result = await pool.request()
                .input('email', sql.NVarChar, email)
                .query('SELECT * FROM usuarios WHERE email = @email AND activo = 1');

            user = result.recordset[0];
            if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

            const validPassword = bcrypt.compareSync(password, user.password_hash);
            if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

            const rolResult = await pool.request()
                .input('id_rol', sql.Int, user.id_rol)
                .query('SELECT * FROM roles WHERE id_rol = @id_rol');

            rol = rolResult.recordset[0];

            // El JSON guardado en MSSQL viene como string, hay que parsearlo
            if (rol && typeof rol.accesos_menu === 'string') {
                try { rol.accesos_menu = JSON.parse(rol.accesos_menu); } catch (e) { }
            }
        }

        const token = jwt.sign(
            {
                id_usuario: user.id_usuario,
                email: user.email,
                nombre: user.nombre,
                rol: rol?.nombre || 'Ejecutivo',
                id_rol: user.id_rol,
                accesos_menu: rol?.accesos_menu || []
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id_usuario: user.id_usuario,
                nombre: user.nombre,
                email: user.email,
                rol: rol?.nombre || 'Ejecutivo',
                id_rol: user.id_rol,
                accesos_menu: rol?.accesos_menu || []
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Error interno de servidor al hacer login' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password, id_rol } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        const password_hash = bcrypt.hashSync(password, 10);

        if (process.env.USE_MOCK === 'true') {
            const exists = mockData.usuarios.find(u => u.email === email);
            if (exists) return res.status(400).json({ error: 'El email ya está registrado' });

            const newUser = {
                id_usuario: mockData.usuarios.length + 1,
                nombre, email, password_hash, id_rol: id_rol || 3, activo: true,
                fecha_creacion: new Date().toISOString().split('T')[0]
            };
            mockData.usuarios.push(newUser);
            res.status(201).json({ message: 'Usuario creado', id_usuario: newUser.id_usuario });
        } else {
            // REGISTRO EN BASE DE DATOS REAL (SQL SERVER)
            const pool = await getConnection();

            const exists = await pool.request()
                .input('email', sql.NVarChar, email)
                .query('SELECT id_usuario FROM usuarios WHERE email = @email');

            if (exists.recordset.length > 0) return res.status(400).json({ error: 'El email ya está registrado' });

            const insertResult = await pool.request()
                .input('nombre', sql.NVarChar, nombre)
                .input('email', sql.NVarChar, email)
                .input('password_hash', sql.NVarChar, password_hash)
                .input('id_rol', sql.Int, id_rol || 3)
                .query('INSERT INTO usuarios (nombre, email, password_hash, id_rol) OUTPUT INSERTED.id_usuario VALUES (@nombre, @email, @password_hash, @id_rol)');

            res.status(201).json({ message: 'Usuario creado en SQL', id_usuario: insertResult.recordset[0].id_usuario });
        }
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Error del servidor al registrar usuario' });
    }
});

module.exports = router;
