// Erreur métier avec un code HTTP explicite, distincte d'une erreur inattendue (bug, panne DB).
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Évite un try/catch répété dans chaque route : toute rejection de la fonction async
// est transmise à errorHandler via next().
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Middleware d'erreur unique pour toute l'API.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Erreurs du lecteur JSON (express.json) : la faute vient du client, pas du serveur → 4xx lisible, pas 500.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Requête illisible : le corps n'est pas un JSON valide." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Requête trop volumineuse." });
  }
  console.error(err);
  res.status(500).json({ error: "Une erreur interne est survenue." });
}

module.exports = { AppError, asyncHandler, errorHandler };
