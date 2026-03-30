require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Files are served directly from Google Cloud Storage (no local uploads)

// Public routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/configuracion', require('./routes/configuracion'));

// Protected routes
app.use('/api/tickets', authMiddleware, require('./routes/tickets'));
app.use('/api/oris', authMiddleware, require('./routes/oris'));
app.use('/api/autorizaciones', authMiddleware, require('./routes/autorizaciones'));
app.use('/api/mensajes', authMiddleware, require('./routes/mensajes'));
app.use('/api/usuarios', authMiddleware, require('./routes/usuarios'));
app.use('/api/parametricas', authMiddleware, require('./routes/parametricas'));
app.use('/api/estadisticas', authMiddleware, require('./routes/estadisticas'));
app.use('/api/plantillas', authMiddleware, require('./routes/plantillas'));

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 GClientes API corriendo en http://localhost:${PORT}`);
    console.log(`📋 Modo: ${process.env.USE_MOCK === 'true' ? 'MOCK (datos simulados)' : 'SQL Server'}`);
});

