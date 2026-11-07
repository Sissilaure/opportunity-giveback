// Messages de validation en français pour toute l'API : sans ça, zod renvoie « Required » ou « Invalid input »,
// et ces textes arrivent tels quels dans l'interface. Un message explicite posé dans un schéma garde la priorité.
const { z } = require("zod");

z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case "invalid_type":
      return { message: issue.received === "undefined" ? "Champ obligatoire." : "Format de donnée invalide." };
    case "invalid_enum_value":
    case "invalid_literal":
      return { message: "Valeur non autorisée." };
    case "invalid_string":
      if (issue.validation === "email") return { message: "Adresse email invalide." };
      if (issue.validation === "url") return { message: "Adresse web invalide." };
      return { message: "Texte invalide." };
    case "too_small":
      if (issue.type === "string") {
        return { message: issue.minimum <= 1 ? "Champ obligatoire." : `Texte trop court (minimum ${issue.minimum} caractères).` };
      }
      if (issue.type === "array") return { message: `Au moins ${issue.minimum} élément(s) requis.` };
      return { message: `La valeur doit être supérieure ou égale à ${issue.minimum}.` };
    case "too_big":
      if (issue.type === "string") return { message: `Texte trop long (maximum ${issue.maximum} caractères).` };
      if (issue.type === "array") return { message: `Pas plus de ${issue.maximum} élément(s).` };
      return { message: `La valeur doit être inférieure ou égale à ${issue.maximum}.` };
    default:
      return { message: ctx.defaultError === "Invalid input" ? "Donnée invalide." : ctx.defaultError };
  }
});
