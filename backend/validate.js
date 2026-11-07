require("./zodFr");
const { AppError } = require("./errors");

// Valide req[source] avec un schema zod, remplace req[source] par la valeur normalisée
// (trim, valeurs par défaut appliquées) et renvoie une 400 lisible en cas d'échec.
function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues[0]?.message || "Requête invalide.";
      return next(new AppError(400, message));
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
