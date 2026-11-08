const { safeHttpUrl } = require("./security");

const SEUIL_ALERTE_JOURS = 15;

// Jours calendaires entre aujourd'hui et une date d'échéance, indépendants du fuseau horaire et du format reçu :
// mysql2 renvoie un Date (minuit local) mais une base ou un pilote configuré autrement peut donner « 2026-03-15 » ou un
// ISO en UTC. On ne garde que année-mois-jour, comme l'échéance a été saisie, puis on compte des jours entiers.
function joursAvant(echeance, maintenant = new Date()) {
  const texte = echeance instanceof Date
    ? `${echeance.getFullYear()}-${String(echeance.getMonth() + 1).padStart(2, "0")}-${String(echeance.getDate()).padStart(2, "0")}`
    : String(echeance).slice(0, 10);
  const [a, m, j] = texte.split("-").map(Number);
  if (!a || !m || !j) return null;
  const jourEcheance = Date.UTC(a, m - 1, j);
  const aujourdHui = Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  return Math.round((jourEcheance - aujourdHui) / 86400000);
}

function formatOpportunite(row) {
  let joursRestants = null;
  let statutEcheance = "permanente";
  if (row.date_echeance) {
    joursRestants = joursAvant(row.date_echeance);
    if (joursRestants === null) statutEcheance = "permanente";
    else if (joursRestants < 0) statutEcheance = "depassee";
    else if (joursRestants <= SEUIL_ALERTE_JOURS) statutEcheance = "proche";
    else statutEcheance = "normale";
  }

  return {
    id: row.id,
    titre: row.titre,
    type: row.type,
    organisme: row.organisme,
    siteWeb: safeHttpUrl(row.site_web),
    publicEligible: row.public_eligible,
    criteres: (row.criteres || "").split("\n").filter(Boolean),
    piecesRequises: (row.pieces_requises || "").split("\n").filter(Boolean),
    dateEcheance: row.date_echeance,
    joursRestants,
    statutEcheance,
    // Filtré aussi à la lecture : des lignes anciennes ou proposées par l'IA pourraient contenir un lien non http(s).
    lienSource: safeHttpUrl(row.lien_source),
    dateVerification: row.date_verification,
    statut: row.statut,
    // Image d'aperçu de l'organisme (https uniquement) ; absente → l'interface retombe sur une photo par type.
    imageUrl: row.image_url && String(row.image_url).startsWith("https://") ? safeHttpUrl(row.image_url) : null,
    // Publiée sans relecture humaine : l'interface le dit et invite à confirmer sur le site officiel.
    verificationAuto: Boolean(row.verification_auto),
  };
}

async function fetchOpportunitesVerifiees(pool) {
  const [rows] = await pool.query(`
    SELECT o.*, s.nom AS organisme, s.site_web
    FROM opportunite o
    JOIN structure_partenaire s ON s.id_structure = o.id_structure
    WHERE o.statut = 'verifiee'
  `);
  return rows.map(formatOpportunite);
}

// Retrouve l'organisme par son nom exact, ou le crée s'il n'existe pas encore
// (utilisé par l'ajout manuel admin et par les propositions de l'IA).
async function findOrCreateStructure(pool, nom, siteWeb) {
  const [rows] = await pool.query("SELECT id_structure FROM structure_partenaire WHERE nom = ?", [nom]);
  if (rows[0]) return rows[0].id_structure;

  const [result] = await pool.query("INSERT INTO structure_partenaire (nom, site_web) VALUES (?, ?)", [
    nom,
    siteWeb || null,
  ]);
  return result.insertId;
}

// Archive (statut 'expiree') les opportunités publiées dont l'échéance est dépassée
// depuis plus de `joursApresEcheance` jours : elles disparaissent du répertoire public
// sans être supprimées, au cas où l'équipe voudrait les consulter plus tard.
async function marquerExpirees(pool, joursApresEcheance = 20) {
  const [result] = await pool.query(
    `UPDATE opportunite
     SET statut = 'expiree'
     WHERE statut = 'verifiee'
       AND date_echeance IS NOT NULL
       AND date_echeance < DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [joursApresEcheance],
  );
  return result.affectedRows;
}

module.exports = { joursAvant, formatOpportunite, fetchOpportunitesVerifiees, findOrCreateStructure, marquerExpirees };
