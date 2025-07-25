const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']; // Get token from "Authorization" header
  const token = authHeader && authHeader.split(' ')[1]; // Expect format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Access denied, token missing!' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user; // Attach decoded user info (like userId, email) to request object
    next(); // Allow request to continue to protected route
  });
}

module.exports = authenticateToken;

