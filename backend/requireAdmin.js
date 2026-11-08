// Vérifie qu'une session admin valide existe avant de laisser passer la requête.
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: "Non authentifié." });
}

module.exports = requireAdmin;