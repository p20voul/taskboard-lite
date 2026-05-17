const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'taskboard_secret_key_2026';

/**
 * Middleware επαλήθευσης JWT token
 * Ελέγχει το Authorization: Bearer <token> header
 * Αν το token είναι έγκυρο, προσθέτει req.user με τα στοιχεία του χρήστη
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Απαιτείται authentication token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Το token έχει λήξει' });
    }
    return res.status(401).json({ error: 'Μη έγκυρο token' });
  }
}

module.exports = authMiddleware;
