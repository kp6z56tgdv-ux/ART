const jwt = require('jsonwebtoken');
const config = require('../../config.json');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión.' });
  }

  try {
    req.admin = jwt.verify(token, config.auth.jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' });
  }
}

module.exports = authMiddleware;
