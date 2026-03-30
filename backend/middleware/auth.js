const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;
        if (!allowedRoles.includes(req.user.id_rol)) {
            return res.status(403).json({ error: 'No tiene permisos para esta acción' });
        }
        next();
    };
}

module.exports = { authMiddleware, requireRole };
