const { z } = require("zod");

const TYPES_OPPORTUNITE = ["bourse", "stage", "emploi", "concours", "autre"];

const opportunitesQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  type: z.union([z.enum(TYPES_OPPORTUNITE), z.literal("")]).optional().default(""),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email requis."),
  motDePasse: z.string().min(1, "Mot de passe requis."),
});

const questionSchema = z.object({
  texte: z.string().trim().min(1, "La question ne peut pas être vide.").max(2000, "La question dépasse 2000 caractères."),
});

const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide.").max(255),
  frequence: z.enum(["immediate", "hebdomadaire"]).optional().default("hebdomadaire"),
});

const answerSchema = z.object({
  reponse: z.string().trim().min(1, "La réponse ne peut pas être vide."),
});

const rechercheIaSchema = z.object({
  description: z
    .string()
    .trim()
    .min(3, "Décris ta situation en quelques mots.")
    .max(500, "Décris ta situation en 500 caractères maximum."),
});

// Ajout manuel par l'admin : criteres/piecesRequises restent du texte brut (une ligne = un élément),
// comme stocké en base : pas besoin de les découper ici, formatOpportunite s'en charge à la lecture.
const opportuniteAdminSchema = z.object({
  titre: z.string().trim().min(3, "Titre trop court.").max(255),
  type: z.enum(TYPES_OPPORTUNITE),
  organisme: z.string().trim().min(2, "Nom de l'organisme requis.").max(255),
  siteWeb: z.string().trim().max(255).optional().default(""),
  publicEligible: z.string().trim().max(2000).optional().default(""),
  criteres: z.string().trim().max(4000).optional().default(""),
  piecesRequises: z.string().trim().max(4000).optional().default(""),
  dateEcheance: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ).")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  lienSource: z.string().trim().url("URL invalide."),
});

module.exports = {
  TYPES_OPPORTUNITE,
  opportunitesQuerySchema,
  loginSchema,
  questionSchema,
  newsletterSchema,
  answerSchema,
  rechercheIaSchema,
  opportuniteAdminSchema,
};
