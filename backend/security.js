const { AppError } = require("./errors");

// Ne laisse passer que les liens http(s) : `new URL()` (donc zod .url()) accepte aussi
// `javascript:` ou `data:`, qui s'exécuteraient au clic sur un <a href>.
function safeHttpUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const { protocol } = new URL(trimmed);
    return protocol === "http:" || protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

// Protection CSRF pour une API à cookie de session : en production le cookie est
// SameSite=None (frontend et backend sur des domaines différents), donc un site tiers
// pourrait déclencher un POST simple. Les navigateurs envoient toujours `Origin` sur ces
// requêtes : on refuse toute écriture dont l'origine n'est pas celle du frontend.
function createOriginGuard(allowedOrigin) {
  const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
  return function originGuard(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.headers.origin;
    if (origin && origin !== allowedOrigin) {
      return next(new AppError(403, "Origine non autorisée."));
    }
    if (!origin && req.headers["sec-fetch-site"] === "cross-site") {
      return next(new AppError(403, "Origine non autorisée."));
    }
    next();
  };
}

module.exports = { safeHttpUrl, createOriginGuard };
